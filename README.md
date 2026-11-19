# 🎹 Virtual Piano 61 (C2 – C7) | 61 键网页三角钢琴

[English](#english) · [中文](#中文)

---

## 中文

一款极简优雅的 **61 键网页虚拟钢琴 (C2 – C7)**，内置真实 **Yamaha C5 Acoustic 三角钢琴采样音源**、暖橙色 **瀑布流落键动画**、自动会话录音，以及一首 1 分 05 秒久石让 × 宫崎骏配乐风格的钢琴独奏 **《纸飞机越过山丘》**（通过真实键盘事件自动完整弹奏）。

### ✨ 核心特性

- **61 键完整键盘映射 (`C2 – C7`)**：
  - **36 个白键**：直接按键盘上的数字与小写字母（`1`–`0`、`q`–`p`、`a`–`l`、`z`–`m`）。
  - **25 个黑键**：按住 **`Shift`** + 对应按键（`! @ $ % ^ * ( Q W E T Y I O P S D G H J L Z C V B`）。
  - **延音踏板**：按住 **`空格键 (Space)`** 踩下延音踏板，松开空格抬起踏板（也可点击界面右上角 `踏板` 按钮切换）。
  - 支持鼠标点击与拖动刮奏（Glissando）。
- **真实 Yamaha C5 三角钢琴音色**：本地集成 22 组 Salamander Grand Piano 录音室采样（覆盖全部 61 键，最大音高微调仅 `±1` 半音），配力度感应琴槌低通滤波、声像分布、音乐厅微混响与真实止音阻尼。
- **瀑布流落键视效**：纯黑舞台配八度分割线，演奏时白键与黑键音柱提前自顶飘落，触键瞬间与对应亮起的橙色琴键无缝衔接；手动演奏时亦会生成向上飘升的音柱反馈。
- **自动会话录音**：页面打开即开始记录弹奏的每一个音符与踏板动作（保存在 `window.pianoRecording`，刷新页面即开启新的一遍）。
- **完整版原创/补全独奏《纸飞机越过山丘》(1:05)**：
  - **开头 (`0:00 – 0:12`)**：A 大调抒情引子（`Amaj9 → F♯m9 → Dmaj9 → E6 → C♯m7 → F♯m9`）
  - **主部 (`0:12 – 0:24`)**：延续 `5–3–2–1` 核心动机的歌唱乐段
  - **过渡 (`0:24 – 0:41`)**：`Dmaj9 → Dm9` 同主音转调至 C 大调，左手提前切入十六分音符宽广琶音，低音 `A→B→C→E` 配右手八度渐强推升
  - **高潮 (`0:41 – 0:56`)**：C 大调华丽高潮（`Fmaj9 → G9sus4 → E7 → Am7 → Dm9 [最高音 A6] → G7 → Cadd9 → Fmaj9`）
  - **尾声 (`0:56 – 1:05`)**：`G9sus4 → G6 → Fm` 怀旧解决，最终以纯净 `Cadd9` 向上滚奏收束
  - 演奏器全程向 `window` 派发真实 `KeyboardEvent`（含 `Shift` 黑键与 `Space` 踏板），与手动弹奏走完全一致的逻辑；点击顶部 **⏭ 高潮 (0:41)** 可直达高潮段落。完整按键谱见 [SCORE.md](./SCORE.md)，成品音频见 [audio/paper-plane-over-the-hill.mp3](./audio/paper-plane-over-the-hill.mp3)（320kbps 立体声 MP3）。

### 🚀 本地运行

无需任何构建步骤或第三方依赖，在项目根目录启动任意静态 HTTP 服务器即可：

```bash
git clone https://github.com/HermanTeng19/virtual-piano-61.git
cd virtual-piano-61
python3 -m http.server 8096
```

在浏览器访问：
- `http://localhost:8096` — 自由弹奏 / 点击顶部按钮播放全曲
- `http://localhost:8096/?perform=1` — 打开演奏引导弹窗，一键开始演奏《纸飞机越过山丘》

---

## English

A minimalist, studio-voiced **61-key Virtual Web Piano (C2 – C7)** powered by real **Yamaha C5 Acoustic Grand Piano samples**, featuring a Synthesia-style warm-orange **falling-note waterfall animation**, automatic session recording, and a complete 1:05 Joe Hisaishi / Studio Ghibli-inspired solo piano performance of ***Paper Plane Over the Hill* (《纸飞机越过山丘》)** played via genuine keyboard events.

### ✨ Features

- **61-Key Computer Keyboard Mapping (`C2 – C7`)**:
  - **36 White Keys**: Digits and lowercase letters (`1`–`0`, `q`–`p`, `a`–`l`, `z`–`m`).
  - **25 Black Keys**: Hold **`Shift`** + the corresponding key (`! @ $ % ^ * ( Q W E T Y I O P S D G H J L Z C V B`).
  - **Sustain Pedal**: Hold **`Space`** to engage the damper pedal and release to damp (or click the `踏板` button to toggle).
  - Full pointer click and drag-glissando support.
- **Authentic Yamaha C5 Acoustic Grand Piano Sound**: Bundles 22 local Salamander Grand Piano studio recordings (`A1`–`C7`, max ±1 semitone pitch shift across all 61 keys) with velocity-sensitive hammer-felt filtering, stereo bench panning, subtle hall reverb, and realistic damper release.
- **Falling-Note Waterfall Visualization**: Pure-black waterfall stage aligned pixel-for-pixel with all 61 keys, displaying glowing coral-orange white-key bars and copper-orange black-key bars that seamlessly light up the corresponding keys on impact (plus upward-rising bars during live manual play).
- **Automatic Session Recording**: Every note and sustain pedal event played on the page is captured in `window.pianoRecording` (refresh the page to start a fresh take).
- **Complete 1:05 Solo Piano Performance — *Paper Plane Over the Hill***:
  - **Opening (`0:00 – 0:12`)**: Lyrical A-major intro (`Amaj9 → F♯m9 → Dmaj9 → E6 → C♯m7 → F♯m9`)
  - **Main Theme (`0:12 – 0:24`)**: Singing development of the `5–3–2–1` pentatonic motif
  - **Transition (`0:24 – 0:41`)**: Seamless parallel-minor pivot (`Dmaj9 → Dm9`) into C major, layered 16th-note left-hand arpeggios, ascending bass (`A→B→C→E`), and octave crescendo
  - **Climax (`0:41 – 0:56`)**: Soaring C-major climax (`Fmaj9 → G9sus4 → E7 → Am7 → Dm9 [apex A6] → G7 → Cadd9 → Fmaj9`)
  - **Ending (`0:56 – 1:05`)**: Ritardando through `G9sus4 → G6 → Fm`, resolving into a crystal-clear rolled `Cadd9` chord
  - Driven by real `KeyboardEvent` dispatches (`keydown`/`keyup`, `Shift` for black keys, `Space` for sustain pedal). Jump straight to the climax via the **⏭ 高潮 (0:41)** button, read the key-by-key score in [SCORE.md](./SCORE.md), or listen directly to the rendered 320kbps stereo recording in [audio/paper-plane-over-the-hill.mp3](./audio/paper-plane-over-the-hill.mp3).

### 🚀 Quick Start

Zero build tools or external runtime dependencies required. Serve the directory with any static HTTP server:

```bash
git clone https://github.com/HermanTeng19/virtual-piano-61.git
cd virtual-piano-61
python3 -m http.server 8096
```

Then open:
- `http://localhost:8096` — Play freely or click the top play button
- `http://localhost:8096/?perform=1` — Open with the one-click performance prompt

---

### 📂 Project Structure / 项目结构

```text
virtual-piano-61/
├── index.html       # Minimalist UI shell & native <dialog> performance prompt
├── style.css        # Dark wood-framed 61-key piano, waterfall HUD & orange key states
├── keys.js          # 61-key (C2–C7) pitch & computer keyboard mapping table
├── piano.js         # Yamaha C5 sample engine, waterfall canvas & keyboard auto-performer
├── composition.js   # Full 1:05 score & keypress compiler for《纸飞机越过山丘》
├── SCORE.md         # Complete computer-keyboard score reference
├── audio/           # Rendered 320kbps stereo MP3 of《纸飞机越过山丘》
└── samples/         # 22 local Yamaha C5 Salamander Grand Piano MP3 samples (A1–C7)
```

### 🎵 Credits / 音源致谢

- Acoustic grand piano samples are sourced from the open-source **Salamander Grand Piano** (Yamaha C5, recorded by Alexander Holm, CC-BY-3.0).
