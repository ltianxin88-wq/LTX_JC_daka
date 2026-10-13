# -*- coding: utf-8 -*-
"""
iepms_auto_signin.py - iEPMS 平台自动化登录与滑块验证码识别
===========================================================
业务与技术实现：
1. 账号密码登录：调用 Playwright 模拟浏览器提交工号和密码（密码由 Windows 凭据管理器读取）。
2. 滑块验证码识别：提取背景图与滑块图，结合 OpenCV 模板匹配与边缘分析定位缺口坐标。
3. 拟人化滑动：采用带有加速度与微调的贝塞尔曲线轨迹拖动滑块，通过行为风控校验。
4. 会话保持：登录成功后导出 session_state.json 供主程序和会话守护进程使用。
"""

import time
import os
import math
import random
import io
import sys
import base64
import json
import traceback
from plugin_paths import data_root

import cv2
import numpy as np

# 确保 stdout 支持 UTF-8
if sys.stdout is not None and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# =============================================================
# 常量与路径
# =============================================================
SCRIPT_DIR = str(data_root())
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
SESSION_FILE = os.path.join(SCRIPT_DIR, "session_state.json")
DEBUG_DIR = SCRIPT_DIR  # 调试截图保存位置

from logger import log as _shared_log
import keyring_utils

# 本模块内的 print 全部走统一日志（文件 + 控制台）
def print(*args, **kwargs):
    _shared_log(" ".join(str(a) for a in args))

START_URL = "https://iepms.zte.com.cn/zte-crm-iepms-baseui/#/main/mainPortal"

MAX_CAPTCHA_ATTEMPTS = 5   # 验证码最大重试次数
CAPTCHA_WAIT_SEC = 3       # 点击登录后等待验证码弹出的秒数


# =============================================================
# 贝塞尔曲线鼠标轨迹生成器
# =============================================================
def _bezier_point(t, p0, p1, p2, p3):
    """三次贝塞尔曲线上 t ∈ [0,1] 处的点"""
    u = 1 - t
    return (u**3 * p0 + 3 * u**2 * t * p1 +
            3 * u * t**2 * p2 + t**3 * p3)


def generate_human_track(distance):
    """
    生成拟人化鼠标轨迹（像素级 X 增量列表）。

    特征：
      - 起步慢 → 中间快 → 接近目标减速
      - 微小过冲 → 缓慢回退修正
      - Y 轴随机偏移（由调用方处理）
    """
    if distance <= 0:
        return [0]

    # 贝塞尔控制点（水平方向）
    p0 = 0.0
    p3 = distance
    # 控制点决定加速/减速曲线形态
    p1 = distance * random.uniform(0.3, 0.45)
    p2 = distance * random.uniform(0.65, 0.85)

    # 生成 t 采样点（步数 = 距离 / 2 ~ 距离 / 3，模拟真人拖拽速率）
    num_steps = max(int(distance / random.uniform(2.0, 3.5)), 15)
    t_values = [i / num_steps for i in range(num_steps + 1)]

    # 采样贝塞尔曲线，得到绝对位置
    positions = [_bezier_point(t, p0, p1, p2, p3) for t in t_values]

    # 转为增量（通过四舍五入绝对位置作差，防止浮点数累加漂移）
    track = []
    for i in range(1, len(positions)):
        dx = round(positions[i]) - round(positions[i - 1])
        track.append(dx)

    # 加入微小过冲（overshoot）+ 回退修正
    overshoot = random.randint(2, 5)
    track.append(overshoot)
    # 回退
    corrections = []
    remaining = overshoot
    while remaining > 0:
        step = min(remaining, random.randint(1, 2))
        corrections.append(-step)
        remaining -= step
    track.extend(corrections)

    # 末尾再加一点微颤抖（模拟松手前的犹豫）
    track.extend([random.choice([-1, 0, 1]) for _ in range(random.randint(1, 3))])

    return track


# =============================================================
# OpenCV 缺口检测 — 三重策略
# =============================================================
def _decode_base64_image(b64_str, flags=cv2.IMREAD_COLOR):
    """解码 Base64 图片字符串为 OpenCV 图像"""
    raw = b64_str.split(",")[1] if "," in b64_str else b64_str
    img_data = base64.b64decode(raw)
    img = cv2.imdecode(np.frombuffer(img_data, np.uint8), flags)
    return img


def strategy_gray_template(bg_img, block_img):
    """策略 A：灰度 + 高斯模糊 + 模板匹配"""
    try:
        bg_gray = cv2.cvtColor(bg_img, cv2.COLOR_BGR2GRAY)
        block_gray = cv2.cvtColor(block_img, cv2.COLOR_BGR2GRAY)
        # 高斯模糊抑制纹理噪声
        bg_blur = cv2.GaussianBlur(bg_gray, (3, 3), 0)
        block_blur = cv2.GaussianBlur(block_gray, (3, 3), 0)
        res = cv2.matchTemplate(bg_blur, block_blur, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(res)
        return max_loc[0], max_val
    except Exception as e:
        print(f"  [策略A] 失败: {e}")
        return None, 0


def strategy_edge_template(bg_img, block_img):
    """策略 B：Canny 边缘 + 模板匹配"""
    try:
        bg_gray = cv2.cvtColor(bg_img, cv2.COLOR_BGR2GRAY)
        block_gray = cv2.cvtColor(block_img, cv2.COLOR_BGR2GRAY)
        bg_edge = cv2.Canny(bg_gray, 100, 200)
        block_edge = cv2.Canny(block_gray, 100, 200)
        res = cv2.matchTemplate(bg_edge, block_edge, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(res)
        return max_loc[0], max_val
    except Exception as e:
        print(f"  [策略B] 失败: {e}")
        return None, 0


def strategy_column_variance(bg_img, block_img):
    """
    策略 C：背景图列像素标准差分析。
    缺口区域的列标准差会出现突变（因为缺口覆盖层颜色均匀）。
    """
    try:
        bg_gray = cv2.cvtColor(bg_img, cv2.COLOR_BGR2GRAY).astype(np.float64)
        h, w = bg_gray.shape
        block_h, block_w = block_img.shape[:2]

        # 跳过左侧 10%（拼图块初始位置）和右侧 5%
        start_col = max(int(w * 0.10), block_w)
        end_col = int(w * 0.95)

        # 计算每列的标准差
        col_stds = np.array([np.std(bg_gray[:, c]) for c in range(start_col, end_col)])

        # 用滑动窗口找标准差最低的连续区域（缺口覆盖层比较均匀）
        win_size = max(block_w // 2, 10)
        if len(col_stds) < win_size:
            return None, 0

        rolling_avg = np.convolve(col_stds, np.ones(win_size) / win_size, mode='valid')
        min_idx = np.argmin(rolling_avg)
        gap_x = start_col + min_idx

        # 置信度用标准差的下降幅度衡量
        median_std = np.median(col_stds)
        min_std = rolling_avg[min_idx]
        confidence = max(0, (median_std - min_std) / (median_std + 1e-6))

        return gap_x, confidence
    except Exception as e:
        print(f"  [策略C] 失败: {e}")
        return None, 0


def find_gap_offset(bg_base64, block_base64):
    """
    三重策略检测缺口位置，返回 (gap_x_in_original_image, original_image_width)。
    gap_x 是缺口左边缘在原始图片坐标系中的 X 像素位置。
    """
    bg_img = _decode_base64_image(bg_base64)
    block_img = _decode_base64_image(block_base64)

    if bg_img is None or block_img is None:
        print("  ❌ 图片解码失败")
        return None, None

    orig_w = bg_img.shape[1]
    print(f"  📐 原始图片尺寸: {bg_img.shape[1]}x{bg_img.shape[0]}, "
          f"拼图块尺寸: {block_img.shape[1]}x{block_img.shape[0]}")

    # 如果拼图块尺寸和背景图差不多大，说明拿到的不是真正的拼图块
    if block_img.shape[1] > bg_img.shape[1] * 0.5:
        print("  ⚠️ 拼图块宽度异常（超过背景图50%），可能选错了元素")

    # 运行三个策略
    results = []

    x_a, conf_a = strategy_gray_template(bg_img, block_img)
    if x_a is not None:
        print(f"  [策略A 灰度匹配] gap_x={x_a}, 置信度={conf_a:.3f}")
        results.append(x_a)

    x_b, conf_b = strategy_edge_template(bg_img, block_img)
    if x_b is not None:
        print(f"  [策略B 边缘匹配] gap_x={x_b}, 置信度={conf_b:.3f}")
        results.append(x_b)

    x_c, conf_c = strategy_column_variance(bg_img, block_img)
    if x_c is not None:
        print(f"  [策略C 列方差]   gap_x={x_c}, 置信度={conf_c:.3f}")
        results.append(x_c)

    if not results:
        print("  ❌ 所有策略均失败")
        return None, orig_w

    # 取中位数
    results.sort()
    median_x = results[len(results) // 2]
    print(f"  ✅ 三策略中位数 gap_x = {median_x}")

    return median_x, orig_w


# =============================================================
# 核心：拼图验证码破解
# =============================================================
def solve_captcha_once(page, attempt_num):
    """
    执行一次拼图验证码破解尝试。
    返回 True 表示验证码通过（弹窗消失），False 表示失败。
    """
    print(f"\n  ────── 验证码尝试 #{attempt_num} ──────")

    # 1. 定位滑块元素
    slider = page.locator('#slider')
    if slider.count() == 0:
        print("  ⚠️ 未检测到 #slider 元素")
        return False

    # 2. 获取背景图 Base64
    big_img = page.locator('#bigImage')
    if big_img.count() == 0:
        print("  ⚠️ 未检测到 #bigImage 元素")
        return False

    bg_base64 = big_img.get_attribute("src")
    if not bg_base64 or not bg_base64.startswith("data:image"):
        print("  ⚠️ #bigImage src 无效")
        return False

    # 3. 获取拼图块图片 Base64
    #    精确定位：sliderPanel 内除了 #bigImage 之外的 img 元素
    small_img = page.locator('#sliderPanel img:not(#bigImage)')
    if small_img.count() == 0:
        # 降级查找：任何带 base64 src 的 img（排除 bigImage）
        print("  ⚠️ 精确选择器未匹配，尝试降级查找...")
        all_imgs = page.locator('.captcha img, .el-dialog img')
        for i in range(all_imgs.count()):
            el = all_imgs.nth(i)
            el_id = el.get_attribute("id") or ""
            if el_id == "bigImage":
                continue
            src = el.get_attribute("src") or ""
            if src.startswith("data:image"):
                small_img = el
                print(f"  ✅ 降级找到小图 (id={el_id})")
                break
        else:
            print("  ❌ 完全找不到拼图块图片元素")
            return False

    # 取第一个匹配的小图
    if hasattr(small_img, 'first'):
        small_img_el = small_img.first
    else:
        small_img_el = small_img

    block_base64 = small_img_el.get_attribute("src")
    if not block_base64 or not block_base64.startswith("data:image"):
        print("  ⚠️ 拼图块 src 无效")
        return False

    print("  ✅ 成功获取背景图和拼图块的 Base64 数据")

    # 4. OpenCV 检测缺口位置
    gap_x, orig_w = find_gap_offset(bg_base64, block_base64)
    if gap_x is None:
        print("  ❌ 缺口检测失败")
        return False

    # 5. 计算实际滑动距离
    slider_container = page.locator('#sliderContainer')
    container_box = slider_container.bounding_box() if slider_container.count() > 0 else None
    slider_box = slider.first.bounding_box()
    bg_box = big_img.first.bounding_box()
    small_box = small_img_el.bounding_box()

    if not slider_box or not bg_box or not small_box:
        print("  ❌ 无法获取元素 bounding box")
        return False

    # 拼图块在背景图上的初始偏移（重要：很多时候拼图块不是紧贴左侧的）
    initial_offset = small_box["x"] - bg_box["x"]

    # DOM 上背景图的显示宽度
    dom_bg_width = bg_box["width"]
    # 缩放比例：DOM 显示宽度 / 原始图片宽度
    scale = dom_bg_width / orig_w if orig_w else 1.0

    # 滑动轨道的可用宽度（容器宽度 - 滑块宽度）
    if container_box:
        track_width = container_box["width"] - slider_box["width"]
    else:
        track_width = dom_bg_width - slider_box["width"]

    # 滑动距离 = (原始缺口X * 缩放) - 拼图块初始偏移
    target_x_in_dom = gap_x * scale
    slide_distance = target_x_in_dom - initial_offset

    # 安全限制
    slide_distance = min(slide_distance, track_width)
    slide_distance = max(slide_distance, 10)

    print(f"  📏 scale={scale:.3f}, 初始偏移={initial_offset:.1f}px")
    print(f"  📏 目标X={target_x_in_dom:.1f}px, 滑动距离={slide_distance:.1f}px (轨道宽={track_width:.0f}px)")

    # 6. 执行拟人化拖拽
    sx = slider_box["x"] + slider_box["width"] / 2
    sy = slider_box["y"] + slider_box["height"] / 2

    # 先移动到滑块上方，模拟真人的瞄准过程
    page.mouse.move(sx + random.randint(-5, 5), sy + random.randint(-10, 5))
    time.sleep(random.uniform(0.1, 0.3))
    page.mouse.move(sx, sy)
    time.sleep(random.uniform(0.05, 0.15))

    # 按下鼠标
    page.mouse.down()
    time.sleep(random.uniform(0.05, 0.15))

    # 生成贝塞尔曲线轨迹并逐步移动
    track = generate_human_track(slide_distance)
    current_x = sx
    current_y = sy

    for i, dx in enumerate(track):
        current_x += dx
        # Y 轴微幅随机偏移（模拟手抖）
        dy = random.choice([-1, 0, 0, 0, 1])
        current_y += dy
        page.mouse.move(current_x, current_y)
        # 变速延迟：开始和结尾慢，中间快
        if i < 3 or i > len(track) - 4:
            time.sleep(random.uniform(0.02, 0.05))
        else:
            time.sleep(random.uniform(0.005, 0.02))

    # 松手前短暂停顿
    time.sleep(random.uniform(0.05, 0.2))
    page.mouse.up()

    print("  🖱️ 拖拽完成，等待服务器验证...")
    time.sleep(2.5)

    # 7. 检测验证码是否通过
    #    如果弹窗消失（#slider 不存在了）或者页面已经开始跳转，说明成功
    still_has_captcha = page.locator('#slider').count() > 0
    if not still_has_captcha:
        print("  ✅ 验证码已通过！弹窗已消失。")
        return True

    # 再等一下看看（有的服务器响应慢）
    time.sleep(1.5)
    still_has_captcha = page.locator('#slider').count() > 0
    if not still_has_captcha:
        print("  ✅ 验证码已通过！弹窗已消失。")
        return True

    # 检查是否有错误提示
    error_el = page.locator('.captcha .el-message, .captcha-error, .slider-error')
    if error_el.count() > 0:
        err_text = error_el.first.inner_text()
        print(f"  ❌ 验证失败提示: {err_text}")
    else:
        print("  ❌ 验证码仍然存在，滑动距离可能不准确")

    return False


def refresh_captcha(page):
    """点击验证码弹窗上的刷新按钮，获取新的验证码图片"""
    refresh_btn = page.locator('#sliderTitle .el-icon-refresh-right, .el-icon-refresh-right')
    if refresh_btn.count() > 0:
        refresh_btn.first.click(force=True)
        print("  🔄 已点击刷新，等待新验证码加载...")
        time.sleep(2)
        return True
    else:
        print("  ⚠️ 未找到刷新按钮")
        return False


# =============================================================
# 主流程
# =============================================================
def run_login(headed=False):
    """
    完整的自动登录流程（授权门置于此处，覆盖 main() 与命令行两条调用路径）：
    1. 打开浏览器 → 进入登录页
    2. 填写账号密码 → 点击登录
    3. 拼图验证码破解（最多 5 次重试）
    4. 等待跳转至业务系统
    5. 保存 session_state.json
    """
    import license_manager
    if not license_manager.require_activation("自动登录"):
        print("❌ 软件未激活，已终止。请先在主程序内完成授权激活。")
        return False

    from playwright.sync_api import sync_playwright

    # 加载配置
    print("📂 加载配置...")
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)

    username = config.get("username", "")
    if not username:
        print("❌ config.json 中未配置 username，请先在 GUI 设置页录入账号")
        return False

    # 密码从 Windows 凭据管理器读取；若 config 残留明文则自动迁移并擦除
    password = keyring_utils.get_password(username)
    legacy_pwd = config.get("password", "")
    if not password and legacy_pwd:
        keyring_utils.set_password(username, legacy_pwd)
        password = legacy_pwd
        try:
            config.pop("password", None)
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=4)
            print("🔐 已将 config 明文密码迁移至 Windows 凭据管理器并擦除")
        except Exception:
            pass

    if not password:
        print("❌ Windows 凭据管理器中未找到该账号密码，请先在 GUI 设置页录入密码并保存")
        return False

    cfg_timeouts = config.get("timeouts", {}) if isinstance(config.get("timeouts"), dict) else {}
    page_load_ms = int(cfg_timeouts.get("page_load_ms", 60000))
    element_wait_ms = int(cfg_timeouts.get("element_wait_ms", 30000))
    enable_debug_screenshots = bool(config.get("debug_screenshots", False))

    print(f"👤 用户: {keyring_utils.mask_account(username)}")
    print(f"🖥️ 模式: {'有头（可视化）' if headed else '无头'}")

    with sync_playwright() as pw:
        # 启动浏览器（默认使用终端机 Chrome；可在 config 中切换为内置 chromium）
        browser_channel = str(config.get("browser_channel", "chrome")).strip()
        launch_kwargs = dict(
            headless=not headed,
            args=[
                '--ignore-certificate-errors',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-gpu',
            ]
        )
        if browser_channel:
            launch_kwargs["channel"] = browser_channel
        try:
            browser = pw.chromium.launch(**launch_kwargs)
        except Exception as e:
            if browser_channel == "chrome":
                print(f"❌ 启动本机 Chrome 失败: {e}")
                print('   请确认已安装 Chrome；或在 config.json 将 browser_channel 改为 "chromium" 使用内置内核')
            raise
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        )
        context.set_default_timeout(element_wait_ms)
        # 注入反检测脚本
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        page = context.new_page()
        login_success = False

        try:
            # ——— 步骤 1：导航至登录页 ———
            print(f"\n🌐 导航至 {START_URL} ...")
            page.goto(START_URL, wait_until="domcontentloaded", timeout=page_load_ms)
            time.sleep(2)

            # 等待登录表单加载（延长超时至 60 秒，自适应重定向延迟）
            try:
                page.wait_for_selector(
                    'input[type="text"], input[type="password"], input[placeholder*="账号"], input[placeholder*="工号"]',
                    state="visible",
                    timeout=60000
                )
            except Exception as e:
                print(f"⚠️ 初次加载等待较慢，再次尝试捕获登录框...")
                time.sleep(3)
                page.wait_for_selector(
                    'input[type="text"], input[type="password"], input',
                    state="visible",
                    timeout=30000
                )
            print("✅ 登录页面已加载")

            # ——— 步骤 2：填写账号密码 ———
            print("\n📝 填写账号密码...")
            # 用户名
            username_input = page.locator(
                'input[placeholder*="账号"], '
                'input[placeholder*="工号"], '
                'input[type="text"]'
            ).first
            username_input.click()
            time.sleep(0.2)
            username_input.fill(username)

            # 密码
            password_input = page.locator('input[type="password"]').first
            password_input.click()
            time.sleep(0.2)
            password_input.fill(password)

            # 勾选复选框（如有协议勾选等）
            checkboxes = page.locator(
                'input[type="checkbox"]:not(:checked), '
                '.el-checkbox:not(.is-checked)'
            )
            for i in range(checkboxes.count()):
                try:
                    checkboxes.nth(i).click(force=True)
                    time.sleep(0.1)
                except Exception:
                    pass

            time.sleep(0.3)
            if enable_debug_screenshots:
                page.screenshot(path=os.path.join(DEBUG_DIR, "DEBUG_step1_filled.png"))

            # ——— 步骤 3：点击登录按钮 ———
            print("\n🔘 点击登录按钮...")
            login_btn = page.locator(
                'button:has-text("登录"), .login-btn, button[type="submit"]'
            ).first
            login_btn.click(force=True)
            print(f"  等待验证码弹窗 ({CAPTCHA_WAIT_SEC}s)...")
            time.sleep(CAPTCHA_WAIT_SEC)

            if enable_debug_screenshots:
                page.screenshot(path=os.path.join(DEBUG_DIR, "DEBUG_step2_after_login_click.png"))

            # ——— 步骤 4：检测并破解拼图验证码 ———
            has_captcha = page.locator('#slider').count() > 0
            if not has_captcha:
                # 也许根本没弹验证码（直接登录成功或者登录失败）
                print("\n⚠️ 未检测到验证码滑块")
                if "login" not in page.url.lower():
                    print("  ✅ 似乎已经直接登录成功！")
                    login_success = True
                else:
                    # 检查是否有错误消息
                    err = page.locator('.el-message__content, .el-form-item__error')
                    if err.count() > 0:
                        print(f"  ❌ 登录失败: {err.first.inner_text()}")
                    else:
                        print("  ❌ 未知状态，请检查截图")
            else:
                print(f"\n🧩 检测到拼图验证码！开始破解（最多 {MAX_CAPTCHA_ATTEMPTS} 次）...")

                for attempt in range(1, MAX_CAPTCHA_ATTEMPTS + 1):
                    solved = solve_captcha_once(page, attempt)
                    if solved:
                        login_success = True
                        break

                    # 失败了 → 刷新验证码图片重试
                    if attempt < MAX_CAPTCHA_ATTEMPTS:
                        print(f"\n  ⏳ 第 {attempt} 次失败，刷新验证码后重试...")
                        refresh_captcha(page)
                        time.sleep(1)

                if not login_success:
                    print(f"\n❌ {MAX_CAPTCHA_ATTEMPTS} 次尝试均失败")
                    if enable_debug_screenshots:
                        page.screenshot(
                            path=os.path.join(DEBUG_DIR, "DEBUG_captcha_all_failed.png")
                        )

            # ——— 步骤 5：等待业务系统跳转 ———
            if login_success:
                print("\n⏳ 等待业务系统跳转...")
                try:
                    # OAuth 流程可能会停在授权页
                    time.sleep(3)
                    auth_btn = page.locator(
                        'button:has-text("授权"), '
                        'button:has-text("Authorize"), '
                        'button:has-text("允许")'
                    )
                    if auth_btn.count() > 0:
                        print("  🔐 检测到 OAuth 授权页面，自动点击授权...")
                        auth_btn.first.click(force=True)

                    page.wait_for_url("**/main/**", timeout=20000)
                    print(f"  ✅ 已跳转至业务系统: {page.url}")
                except Exception:
                    print(f"  ⚠️ 跳转等待超时，当前URL: {page.url}")
                    # 即使超时，也检查一下是否其实已经成功了
                    if "login" not in page.url.lower():
                        print("  ✅ 虽然超时但URL已不是登录页，视为成功")
                    else:
                        login_success = False

            # ——— 步骤 6：保存 Session ———
            if login_success:
                print("\n💾 保存 Session 状态...")
                state = context.storage_state()
                with open(SESSION_FILE, 'w', encoding='utf-8') as f:
                    json.dump(state, f, ensure_ascii=False)
                print(f"  ✅ 已保存至 {SESSION_FILE}")
                print(f"  🍪 共 {len(state.get('cookies', []))} 个 Cookie")

            # 最终截图
            if enable_debug_screenshots:
                page.screenshot(path=os.path.join(DEBUG_DIR, "DEBUG_final_status.png"))
            print(f"\n📍 最终页面: {page.url}")

        except Exception as e:
            err_msg = str(e)
            if password:
                err_msg = err_msg.replace(password, "******")
            print(f"\n💥 运行出错: {err_msg}")
            tb_str = traceback.format_exc()
            if password:
                tb_str = tb_str.replace(password, "******")
            for line in tb_str.splitlines():
                if line.strip():
                    _shared_log(f"  {line}")
            if enable_debug_screenshots:
                try:
                    page.screenshot(path=os.path.join(DEBUG_DIR, "DEBUG_error.png"))
                except Exception:
                    pass
            login_success = False
        finally:
            browser.close()

    if login_success:
        print("\n🎉🎉🎉 自动登录成功！")
    else:
        print("\n😞 自动登录失败，请检查 DEBUG 截图或使用 --headed 模式调试。")

    return login_success


def main(headed=False):
    """作为模块被导入调用时的入口函数，默认无头静默模式"""
    success = run_login(headed=headed)
    return success


# =============================================================
# 命令行入口
# =============================================================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="IEPMS 自动登录（含拼图验证码）")
    parser.add_argument("--headed", action="store_true",
                        help="有头模式运行（可以看到浏览器操作过程）")
    args = parser.parse_args()

    success = run_login(headed=args.headed)
    sys.exit(0 if success else 1)

