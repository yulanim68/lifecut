const STICKER_ASSETS = [
  "귀.png",
  "모자1.png",
  "모자2.png",
  "모자3.png",
  "모자4.png",
  "모자5.png",
  "모자6.png",
  "별.png",
  "안경1.png",
  "안경2.png",
  "하트.png"
];

const FRAME_ASSETS = ["프레임1.png", "프레임2.png"];
const DECORATION_COLORS = [
  { name: "빨강", value: "#ff0000" },
  { name: "주황", value: "#ff8c00" },
  { name: "노랑", value: "#ffd700" },
  { name: "초록", value: "#008000" },
  { name: "파랑", value: "#0000ff" },
  { name: "남색", value: "#4b0082" },
  { name: "보라", value: "#800080" },
  { name: "검정", value: "#000000" },
  { name: "흰색", value: "#ffffff" }
];

const decorationElements = {
  tabs: document.getElementById("editor-tabs"),
  filterInstruction: document.getElementById("filter-instruction"),
  frameOptions: document.getElementById("frame-options"),
  frameColorTargets: document.querySelectorAll(".frame-color-targets .tool-choice"),
  frameColorPalette: document.getElementById("frame-color-palette"),
  stickerOptions: document.getElementById("sticker-options"),
  filterIntensityControls: document.querySelector(".filter-intensity-controls"),
  dreamIntensity: document.getElementById("dream-intensity"),
  dreamIntensityValue: document.getElementById("dream-intensity-value"),
  noiseIntensity: document.getElementById("noise-intensity"),
  noiseIntensityValue: document.getElementById("noise-intensity-value"),
  brushMode: document.getElementById("brush-mode"),
  brushColorToggle: document.getElementById("brush-color-toggle"),
  brushColorPreview: document.getElementById("brush-color-preview"),
  brushPalette: document.getElementById("brush-palette"),
  eraserMode: document.getElementById("eraser-mode"),
  brushColor: document.getElementById("brush-color"),
  brushSizeLabel: document.getElementById("brush-size-label"),
  editorStatus: document.getElementById("editor-status"),
  overlay: document.getElementById("decoration-canvas"),
  trash: document.getElementById("sticker-trash"),
  sizeDown: document.getElementById("size-down"),
  sizeUp: document.getElementById("size-up"),
  rotateLeft: document.getElementById("rotate-left"),
  rotateRight: document.getElementById("rotate-right"),
  clearButton: document.getElementById("clear-decorations"),
  resetCurrentButton: document.getElementById("reset-current-tool")
};

const decorationState = {
  items: [],
  images: new Map(),
  frameImages: new Map(),
  drawingCanvas: document.createElement("canvas"),
  baseCanvas: null,
  activeTab: "frame",
  drawingMode: "brush",
  brushSize: 8,
  eraserSize: 8,
  brushColor: "#ff0000",
  selectedItemId: null,
  frameColorTarget: "title",
  titleColor: "#24231f",
  dateColor: "#77746e",
  filterIntensity: {
    dreamy: 50,
    noise: 50
  },
  nextItemId: 1,
  pointerAction: null,
  onChange: null,
  onBaseChange: null
};

// 스티커 파일 이름에서 화면에 표시할 확장자 없는 이름을 가져옵니다.
function getStickerLabel(fileName) {
  return fileName.replace(/\.png$/i, "");
}

// 편집 중인 캔버스 크기와 도구 상태에 맞춰 크기 조절 버튼을 갱신합니다.
function updateTransformControls() {
  const activeItemType = decorationState.activeTab === "frame"
    ? "frame"
    : decorationState.activeTab === "sticker"
      ? "sticker"
      : "";
  const selectedItem = decorationState.items.find(
    // 선택된 프레임 또는 스티커 항목을 편집 목록에서 찾습니다.
    function (item) {
      return item.id === decorationState.selectedItemId && item.type === activeItemType;
    }
  );
  const isDrawing = decorationState.activeTab === "drawing";
  const currentSize = decorationState.drawingMode === "eraser"
    ? decorationState.eraserSize
    : decorationState.brushSize;
  decorationElements.sizeDown.disabled = !isDrawing && !selectedItem;
  decorationElements.sizeUp.disabled = !isDrawing && !selectedItem;
  decorationElements.rotateLeft.disabled = !selectedItem;
  decorationElements.rotateRight.disabled = !selectedItem;
  decorationElements.brushSizeLabel.textContent = (decorationState.drawingMode === "eraser" ? "지우개" : "브러쉬") + " 크기 " + currentSize;
  decorationElements.brushSizeLabel.classList.toggle("hidden", !isDrawing);
}

// 현재 탭에 맞춰 가로 도구 메뉴와 탭 선택 상태를 표시합니다.
function selectEditorTab(tabName) {
  decorationState.activeTab = tabName;
  const selectedItem = decorationState.items.find(
    // 선택된 편집 요소가 새 탭에 해당하는 종류인지 확인합니다.
    function (item) {
      return item.id === decorationState.selectedItemId;
    }
  );
  const expectedType = tabName === "frame" ? "frame" : tabName === "sticker" ? "sticker" : null;
  if (selectedItem && selectedItem.type !== expectedType) {
    decorationState.selectedItemId = null;
  }
  decorationElements.tabs.querySelectorAll(".editor-tab").forEach(
    // 선택된 탭만 활성화하고 연결된 도구 메뉴를 보여 줍니다.
    function (tab) {
      const isActive = tab.dataset.panel === "panel-" + tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      document.getElementById(tab.dataset.panel).classList.toggle("hidden", !isActive);
    }
  );
  decorationElements.filterInstruction.classList.toggle("hidden", tabName !== "filter");
  updateTransformControls();
}

// 지우개와 브러쉬 중 현재 그리기 도구를 화면과 상태에 표시합니다.
function selectDrawingMode(mode) {
  decorationState.drawingMode = mode;
  decorationElements.brushMode.classList.toggle("active", mode === "brush");
  decorationElements.brushMode.setAttribute("aria-pressed", String(mode === "brush"));
  decorationElements.brushColorToggle.classList.toggle("hidden", mode !== "brush");
  if (mode !== "brush") {
    setBrushPaletteOpen(false);
  }
  decorationElements.eraserMode.classList.toggle("active", mode === "eraser");
  decorationElements.eraserMode.setAttribute("aria-pressed", String(mode === "eraser"));
  decorationElements.editorStatus.textContent = mode === "brush"
    ? "사진을 손가락이나 마우스로 그려 보세요."
    : "사진 위를 문지르면 그린 부분을 지워요.";
  updateTransformControls();
}

// 브러쉬 색상 팔레트를 열거나 닫고 버튼의 접근성 상태를 갱신합니다.
function setBrushPaletteOpen(isOpen) {
  const shouldOpen = isOpen && decorationState.drawingMode === "brush";
  decorationElements.brushPalette.classList.toggle("hidden", !shouldOpen);
  decorationElements.brushColorToggle.setAttribute("aria-expanded", String(shouldOpen));
  decorationElements.brushColorToggle.setAttribute(
    "aria-label",
    "브러쉬 색상 팔레트 " + (shouldOpen ? "닫기" : "열기") + ", 현재 색 " + decorationState.brushColor
  );
}

// 선택한 색상을 브러쉬와 색상 선택기에 적용하고 팔레트 선택 표시를 갱신합니다.
function selectBrushColor(color) {
  decorationState.brushColor = color;
  decorationElements.brushColor.value = color;
  decorationElements.brushColorPreview.style.backgroundColor = color;
  decorationElements.brushPalette.querySelectorAll(".brush-swatch").forEach(
    // 현재 브러쉬 색과 같은 칩만 선택된 모양으로 표시합니다.
    function (swatch) {
      const isActive = swatch.dataset.color.toLowerCase() === color.toLowerCase();
      swatch.classList.toggle("active", isActive);
      swatch.setAttribute("aria-pressed", String(isActive));
    }
  );
  setBrushPaletteOpen(!decorationElements.brushPalette.classList.contains("hidden"));
}

// 프레임 탭에서 색을 바꿀 제목 또는 날짜를 선택해 버튼 상태를 갱신합니다.
function selectFrameColorTarget(target) {
  decorationState.frameColorTarget = target;
  decorationElements.frameColorTargets.forEach(
    // 선택된 색상 대상 버튼만 활성 상태로 표시합니다.
    function (button) {
      const isActive = button.dataset.colorTarget === target;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  );
  const selectedColor = target === "title"
    ? decorationState.titleColor
    : decorationState.dateColor;
  decorationElements.frameColorPalette.querySelectorAll(".frame-color-swatch").forEach(
    // 선택 대상의 현재 색상 칩을 선택 표시합니다.
    function (swatch) {
      const isActive = swatch.dataset.color.toLowerCase() === selectedColor.toLowerCase();
      swatch.classList.toggle("active", isActive);
      swatch.setAttribute("aria-pressed", String(isActive));
    }
  );
}

// 프레임 탭에서 선택한 제목 또는 날짜 글씨 색을 바꿉니다.
function selectFrameColor(color) {
  if (decorationState.frameColorTarget === "title") {
    decorationState.titleColor = color;
    if (decorationState.onBaseChange) {
      decorationState.onBaseChange();
    }
  } else if (decorationState.frameColorTarget === "date") {
    decorationState.dateColor = color;
    if (decorationState.onBaseChange) {
      decorationState.onBaseChange();
    }
  }
  selectFrameColorTarget(decorationState.frameColorTarget);
}

// 등록된 선과 스티커를 투명 편집 캔버스에 다시 그립니다.
function drawDecorations() {
  const canvas = decorationElements.overlay;
  const context = canvas.getContext("2d");
  const drawingCanvas = decorationState.drawingCanvas;
  const drawingContext = drawingCanvas.getContext("2d");
  if (!context || !drawingContext) {
    throw new Error("꾸미기 화면을 준비하지 못했어요. 최신 브라우저에서 다시 시도해 주세요.");
  }

  drawingCanvas.width = canvas.width;
  drawingCanvas.height = canvas.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  decorationState.items.forEach(
    // 브러쉬와 지우개 선을 지우개 전용 그림판에 적용합니다.
    function (item) {
      if (item.type !== "stroke" || item.points.length === 0) {
        return;
      }

      drawingContext.save();
      drawingContext.globalCompositeOperation = item.mode === "eraser" ? "destination-out" : "source-over";
      drawingContext.strokeStyle = item.color;
      drawingContext.fillStyle = item.color;
      drawingContext.lineWidth = item.width;
      drawingContext.lineCap = "round";
      drawingContext.lineJoin = "round";
      drawingContext.beginPath();
      drawingContext.moveTo(item.points[0].x, item.points[0].y);
      if (item.points.length === 1) {
        drawingContext.arc(item.points[0].x, item.points[0].y, item.width / 2, 0, Math.PI * 2);
        drawingContext.fill();
      } else {
        item.points.slice(1).forEach(
          // 손가락이 지나간 점을 매끄러운 선으로 연결합니다.
          function (point) {
            drawingContext.lineTo(point.x, point.y);
          }
        );
        drawingContext.stroke();
      }
      drawingContext.restore();
    }
  );
  decorationState.items.forEach(
    // 선택한 프레임 이미지를 사진 위에서 회전·이동·확대할 수 있게 그립니다.
    function (item) {
      if (item.type !== "frame") {
        return;
      }
      const image = decorationState.frameImages.get(item.fileName);
      if (!image) {
        return;
      }
      const width = item.width * item.scale;
      const height = width * image.height / image.width;
      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.drawImage(image, -width / 2, -height / 2, width, height);
      context.restore();
    }
  );
  decorationState.items.forEach(
    // 프레임 위에 스티커를 차례로 표시합니다.
    function (item) {
      if (item.type !== "sticker") {
        return;
      }
      const image = decorationState.images.get(item.fileName);
      if (!image || !image.complete || image.naturalWidth <= 0) {
        return;
      }
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const width = item.width * item.scale;
      const height = width / imageRatio;
      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.drawImage(image, -width / 2, -height / 2, width, height);
      context.restore();
    }
  );
  context.drawImage(drawingCanvas, 0, 0);
}

// 이미지에 표시된 좌표를 원본 캔버스 픽셀 좌표로 바꿉니다.
function getCanvasPoint(event) {
  const bounds = decorationElements.overlay.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("편집할 사진이 화면에 표시되지 않았어요.");
  }
  return {
    x: (event.clientX - bounds.left) * decorationElements.overlay.width / bounds.width,
    y: (event.clientY - bounds.top) * decorationElements.overlay.height / bounds.height
  };
}

// 사진 위에서 선택한 위치와 겹치는 가장 위쪽 프레임 또는 스티커를 찾습니다.
function findMovableItemAtPoint(point, itemType) {
  for (let index = decorationState.items.length - 1; index >= 0; index -= 1) {
    const item = decorationState.items[index];
    if (item.type !== itemType) {
      continue;
    }
    const image = item.type === "frame"
      ? decorationState.frameImages.get(item.fileName)
      : decorationState.images.get(item.fileName);
    if (!image) {
      continue;
    }
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (imageWidth <= 0 || imageHeight <= 0) {
      continue;
    }
    const imageRatio = imageWidth / imageHeight;
    const width = item.width * item.scale;
    const height = width / imageRatio;
    const offsetX = point.x - item.x;
    const offsetY = point.y - item.y;
    const localX = offsetX * Math.cos(item.rotation) + offsetY * Math.sin(item.rotation);
    const localY = -offsetX * Math.sin(item.rotation) + offsetY * Math.cos(item.rotation);
    if (Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2) {
      return item;
    }
  }
  return null;
}

// 화면에서 누른 스티커가 쓰레기통 영역 안에 있는지 확인합니다.
function isOverTrash(event) {
  const bounds = decorationElements.trash.getBoundingClientRect();
  return event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
}

// 현재 편집 결과가 바뀌었음을 앱에 알려 QR 사진을 새로 만들도록 합니다.
function notifyDecorationChange() {
  drawDecorations();
  updateTransformControls();
  if (decorationState.onChange) {
    decorationState.onChange();
  }
}

// 이미지 중앙의 흰 사진 영역만 투명하게 처리해 원본 사진이 비치도록 합니다.
function makeFrameOpeningTransparent(image) {
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = image.naturalWidth;
  frameCanvas.height = image.naturalHeight;
  const context = frameCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("프레임 이미지를 준비하지 못했어요.");
  }
  context.drawImage(image, 0, 0);
  const framePixels = context.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
  const pixelCount = frameCanvas.width * frameCanvas.height;
  const start = Math.floor(frameCanvas.height / 2) * frameCanvas.width + Math.floor(frameCanvas.width / 2);
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  queue[tail] = start;
  tail += 1;
  visited[start] = 1;
  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const colorIndex = pixelIndex * 4;
    if (
      framePixels.data[colorIndex] < 245 ||
      framePixels.data[colorIndex + 1] < 245 ||
      framePixels.data[colorIndex + 2] < 245
    ) {
      continue;
    }
    framePixels.data[colorIndex + 3] = 0;
    const x = pixelIndex % frameCanvas.width;
    const neighbors = [
      x > 0 ? pixelIndex - 1 : -1,
      x < frameCanvas.width - 1 ? pixelIndex + 1 : -1,
      pixelIndex >= frameCanvas.width ? pixelIndex - frameCanvas.width : -1,
      pixelIndex < pixelCount - frameCanvas.width ? pixelIndex + frameCanvas.width : -1
    ];
    neighbors.forEach(
      // 아직 방문하지 않은 인접 픽셀만 흰 사진 영역 탐색 목록에 추가합니다.
      function (neighbor) {
        if (neighbor >= 0 && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    );
  }
  context.putImageData(framePixels, 0, 0);
  return frameCanvas;
}

// 화면에서 고른 PNG 프레임을 큰 기본 크기로 사진 위에 추가합니다.
function addFrame(fileName) {
  const image = decorationState.frameImages.get(fileName);
  if (!image) {
    decorationElements.editorStatus.textContent = "프레임 이미지를 준비하지 못했어요. 다시 눌러 주세요.";
    return;
  }
  if (!decorationState.baseCanvas) {
    decorationElements.editorStatus.textContent = "사진을 촬영한 뒤 프레임을 추가해 주세요.";
    return;
  }
  const frame = {
    id: decorationState.nextItemId,
    type: "frame",
    fileName: fileName,
    x: decorationState.baseCanvas.width / 2,
    y: decorationState.baseCanvas.height / 2,
    width: decorationState.baseCanvas.width * 0.9,
    scale: 1,
    rotation: 0
  };
  decorationState.nextItemId += 1;
  decorationState.items.push(frame);
  decorationState.selectedItemId = frame.id;
  decorationElements.editorStatus.textContent = "프레임을 추가했어요. 사진 위에서 이동하고 크기를 조절해 보세요.";
  notifyDecorationChange();
}

// 화면에 고른 스티커를 사진 가운데에 새 항목으로 추가합니다.
function addSticker(fileName) {
  const image = decorationState.images.get(fileName);
  if (!image || !image.complete || image.naturalWidth <= 0) {
    decorationElements.editorStatus.textContent = "스티커 이미지를 불러오지 못했어요. 페이지를 새로고침해 주세요.";
    return;
  }
  if (!decorationState.baseCanvas) {
    decorationElements.editorStatus.textContent = "사진을 촬영한 뒤 스티커를 추가해 주세요.";
    return;
  }
  const sticker = {
    id: decorationState.nextItemId,
    type: "sticker",
    fileName: fileName,
    x: decorationState.baseCanvas.width / 2,
    y: decorationState.baseCanvas.height * 0.2,
    width: decorationState.baseCanvas.width * 0.3,
    scale: 1,
    rotation: 0
  };
  decorationState.nextItemId += 1;
  decorationState.items.push(sticker);
  decorationState.selectedItemId = sticker.id;
  decorationElements.editorStatus.textContent = getStickerLabel(fileName) + " 스티커를 추가했어요. 크기와 기울기를 조절해 보세요.";
  notifyDecorationChange();
}

// 선택한 스티커 또는 프레임을 편집 목록에서 지웁니다.
function removeMovableItem(itemId) {
  decorationState.items = decorationState.items.filter(
    // 요청한 편집 항목만 목록에서 제외합니다.
    function (item) {
      return item.id !== itemId;
    }
  );
  if (decorationState.selectedItemId === itemId) {
    decorationState.selectedItemId = null;
  }
  decorationElements.trash.classList.remove("is-drop-target");
  decorationElements.editorStatus.textContent = "선택한 꾸미기 요소를 삭제했어요.";
  notifyDecorationChange();
}

// 크기 버튼을 브러쉬 굵기 또는 선택한 프레임·스티커 확대·축소에 적용합니다.
function changeItemSize(direction) {
  if (decorationState.activeTab === "drawing") {
    if (decorationState.drawingMode === "eraser") {
      decorationState.eraserSize = Math.min(36, Math.max(2, decorationState.eraserSize + direction * 2));
    } else {
      decorationState.brushSize = Math.min(36, Math.max(2, decorationState.brushSize + direction * 2));
    }
    updateTransformControls();
    return;
  }
  const item = decorationState.items.find(
    // 현재 선택된 프레임 또는 스티커의 크기를 바꿉니다.
    function (item) {
      return item.id === decorationState.selectedItemId &&
        (item.type === "frame" || item.type === "sticker");
    }
  );
  if (!item) {
    return;
  }
  const scaleStep = item.type === "frame" ? 0.05 : 0.15;
  const minimumScale = item.type === "frame" ? 0.1 : 0.25;
  const maximumScale = item.type === "frame" ? 4 : 3;
  item.scale = Math.min(
    maximumScale,
    Math.max(minimumScale, Math.round((item.scale + direction * scaleStep) * 100) / 100)
  );
  notifyDecorationChange();
}

// 선택한 스티커를 좌우 버튼 방향으로 조금씩 회전합니다.
function rotateSelectedSticker(direction) {
  const item = decorationState.items.find(
    // 현재 선택된 프레임 또는 스티커의 기울기를 바꿉니다.
    function (item) {
      return item.id === decorationState.selectedItemId &&
        (item.type === "frame" || item.type === "sticker");
    }
  );
  if (!item) {
    return;
  }
  item.rotation += direction * Math.PI / 12;
  notifyDecorationChange();
}

// 그리기 모드에서 시작된 선이나 선택한 스티커 이동을 마칩니다.
function finishPointerAction(event) {
  const action = decorationState.pointerAction;
  if (!action) {
    return;
  }
  if (action.type === "sticker") {
    if (isOverTrash(event)) {
      removeMovableItem(action.itemId);
    } else {
      decorationElements.trash.classList.remove("is-drop-target");
    }
  } else {
    notifyDecorationChange();
  }
  decorationState.pointerAction = null;
  if (decorationElements.overlay.hasPointerCapture(event.pointerId)) {
    decorationElements.overlay.releasePointerCapture(event.pointerId);
  }
}

// 편집 캔버스에서 새 선을 그리거나 기존 스티커를 선택합니다.
function onDecorationPointerDown(event) {
  if (!decorationState.baseCanvas) {
    return;
  }
  const point = getCanvasPoint(event);
  if (decorationState.activeTab === "drawing") {
    const stroke = {
      id: decorationState.nextItemId,
      type: "stroke",
      mode: decorationState.drawingMode,
      color: decorationState.brushColor,
      width: (decorationState.drawingMode === "eraser"
        ? decorationState.eraserSize
        : decorationState.brushSize) * decorationElements.overlay.width /
        decorationElements.overlay.getBoundingClientRect().width,
      points: [point]
    };
    decorationState.nextItemId += 1;
    decorationState.items.push(stroke);
    decorationState.selectedItemId = null;
    decorationState.pointerAction = { type: "stroke" };
  } else if (decorationState.activeTab === "sticker" || decorationState.activeTab === "frame") {
    const itemType = decorationState.activeTab === "frame" ? "frame" : "sticker";
    const item = findMovableItemAtPoint(point, itemType);
    if (!item) {
      return;
    }
    decorationState.selectedItemId = item.id;
    decorationState.pointerAction = {
      type: "sticker",
      itemId: item.id,
      offsetX: point.x - item.x,
      offsetY: point.y - item.y
    };
    decorationElements.editorStatus.textContent = item.type === "frame"
      ? "프레임을 선택했어요."
      : getStickerLabel(item.fileName) + " 스티커를 선택했어요.";
  } else {
    return;
  }
  event.preventDefault();
  decorationElements.overlay.setPointerCapture(event.pointerId);
  drawDecorations();
  updateTransformControls();
}

// 포인터가 움직일 때 선을 이어 그리거나 선택 스티커를 옮깁니다.
function onDecorationPointerMove(event) {
  const action = decorationState.pointerAction;
  if (!action) {
    return;
  }
  const point = getCanvasPoint(event);
  if (action.type === "stroke") {
    decorationState.items[decorationState.items.length - 1].points.push(point);
  } else {
    const sticker = decorationState.items.find(
      // 이동 중인 꾸미기 요소의 현재 좌표를 찾습니다.
      function (item) {
        return item.id === action.itemId &&
          (item.type === "sticker" || item.type === "frame");
      }
    );
    if (sticker) {
      sticker.x = point.x - action.offsetX;
      sticker.y = point.y - action.offsetY;
    }
    decorationElements.trash.classList.toggle("is-drop-target", isOverTrash(event));
  }
  drawDecorations();
}

// 등록된 이미지 목록으로 스티커 선택 버튼을 만들고 이미지 오류를 안내합니다.
function createStickerOptions() {
  decorationElements.stickerOptions.replaceChildren();
  STICKER_ASSETS.forEach(
    // 준비된 PNG 파일마다 미리보기와 선택 버튼을 만듭니다.
    function (fileName) {
      const button = document.createElement("button");
      const image = new Image();
      button.type = "button";
      button.className = "sticker-option";
      button.disabled = true;
      button.setAttribute("aria-label", getStickerLabel(fileName) + " 스티커 추가");
      image.src = "images/imag/" + fileName;
      image.alt = "";
      button.appendChild(image);
      const label = document.createElement("span");
      label.textContent = getStickerLabel(fileName);
      button.appendChild(label);
      image.addEventListener("load",
        // 준비가 끝난 스티커를 선택할 수 있게 합니다.
        function () {
          button.disabled = false;
        }
      );
      image.addEventListener("error",
        // 파일을 읽지 못한 경우 사용자에게 이미지 위치 확인을 안내합니다.
        function () {
          decorationElements.editorStatus.textContent = fileName + " 파일을 불러오지 못했어요. 이미지 파일 위치를 확인해 주세요.";
          console.error("스티커 이미지를 불러오지 못했습니다: images/imag/" + fileName);
        }
      );
      decorationState.images.set(fileName, image);
      button.addEventListener("click",
        // 누른 스티커를 선택 표시하고 사진 프레임에 추가합니다.
        function () {
          decorationElements.stickerOptions.querySelectorAll(".sticker-option").forEach(
            // 마지막으로 누른 스티커 버튼만 선택 모양으로 표시합니다.
            function (option) {
              option.classList.toggle("active", option === button);
            }
          );
          addSticker(fileName);
        }
      );
      decorationElements.stickerOptions.appendChild(button);
    }
  );
}

// 프레임 PNG 두 장을 불러와 미리보기 버튼을 만들고 사진 위에 추가합니다.
function createFrameOptions() {
  decorationElements.frameOptions.replaceChildren();
  FRAME_ASSETS.forEach(
    // 준비된 프레임 이미지마다 선택 버튼을 만듭니다.
    function (fileName) {
      const button = document.createElement("button");
      const image = new Image();
      button.type = "button";
      button.className = "frame-option";
      button.disabled = true;
      button.setAttribute("aria-label", getStickerLabel(fileName) + " 프레임 추가");
      image.src = "p/p2/" + fileName;
      image.alt = "";
      button.appendChild(image);
      const label = document.createElement("span");
      label.textContent = getStickerLabel(fileName);
      button.appendChild(label);
      image.addEventListener("load",
        // 흰 사진 영역을 투명하게 만든 프레임을 사용 준비 완료로 등록합니다.
        function () {
          try {
            decorationState.frameImages.set(fileName, makeFrameOpeningTransparent(image));
            button.disabled = false;
          } catch (error) {
            decorationElements.editorStatus.textContent = error.message;
            console.error(error);
          }
        }
      );
      image.addEventListener("error",
        // 프레임 파일을 찾지 못하면 경로 문제를 화면과 콘솔에 알립니다.
        function () {
          decorationElements.editorStatus.textContent = fileName + " 파일을 불러오지 못했어요. p/p2 폴더를 확인해 주세요.";
          console.error("프레임 이미지를 불러오지 못했습니다: p/p2/" + fileName);
        }
      );
      button.addEventListener("click",
        // 선택한 프레임을 큰 크기로 사진 위에 추가합니다.
        function () {
          decorationElements.frameOptions.querySelectorAll(".frame-option").forEach(
            // 마지막으로 선택한 프레임에만 선택 표시를 둡니다.
            function (option) {
              option.classList.toggle("active", option === button);
            }
          );
          addFrame(fileName);
        }
      );
      decorationElements.frameOptions.appendChild(button);
    }
  );
}

// 현재 선택한 탭의 종류에 해당하는 꾸미기만 초기화합니다.
function resetCurrentTool() {
  if (decorationState.activeTab === "frame") {
    const selectedItem = decorationState.items.find(
      // 선택 항목이 초기화되는 프레임인지 확인합니다.
      function (item) {
        return item.id === decorationState.selectedItemId;
      }
    );
    decorationState.items = decorationState.items.filter(
      // 프레임 탭 초기화는 프레임 항목만 제거합니다.
      function (item) {
        return item.type !== "frame";
      }
    );
    if (selectedItem && selectedItem.type === "frame") {
      decorationState.selectedItemId = null;
    }
    decorationState.titleColor = "#24231f";
    decorationState.dateColor = "#77746e";
    decorationElements.frameOptions.querySelectorAll(".frame-option").forEach(
      // 초기화한 프레임 선택 표시를 모두 지웁니다.
      function (button) {
        button.classList.remove("active");
      }
    );
    selectFrameColorTarget("title");
    if (decorationState.onBaseChange) {
      decorationState.onBaseChange();
    }
  } else if (decorationState.activeTab === "sticker") {
    const selectedItem = decorationState.items.find(
      // 선택 항목이 초기화되는 스티커인지 확인합니다.
      function (item) {
        return item.id === decorationState.selectedItemId;
      }
    );
    decorationState.items = decorationState.items.filter(
      // 스티커 탭 초기화는 스티커 항목만 제거합니다.
      function (item) {
        return item.type !== "sticker";
      }
    );
    if (selectedItem && selectedItem.type === "sticker") {
      decorationState.selectedItemId = null;
    }
    decorationElements.stickerOptions.querySelectorAll(".sticker-option").forEach(
      // 초기화한 스티커 선택 표시를 모두 지웁니다.
      function (button) {
        button.classList.remove("active");
      }
    );
    notifyDecorationChange();
  } else if (decorationState.activeTab === "drawing") {
    decorationState.items = decorationState.items.filter(
      // 그리기 탭 초기화는 브러쉬와 지우개 선만 제거합니다.
      function (item) {
        return item.type !== "stroke";
      }
    );
    decorationState.selectedItemId = null;
    decorationState.brushSize = 8;
    decorationState.eraserSize = 8;
    updateTransformControls();
    notifyDecorationChange();
  } else if (decorationState.activeTab === "filter") {
    decorationState.filterIntensity.dreamy = 50;
    decorationState.filterIntensity.noise = 50;
    decorationElements.dreamIntensity.value = "50";
    decorationElements.noiseIntensity.value = "50";
    decorationElements.dreamIntensityValue.textContent = "50%";
    decorationElements.noiseIntensityValue.textContent = "50%";
    if (decorationState.onBaseChange) {
      decorationState.onBaseChange({ resetFilter: true });
    }
  }
  decorationElements.editorStatus.textContent = "현재 기능의 꾸미기만 초기화했어요.";
}

// 프레임·스티커·그리기·필터 효과를 한꺼번에 기본 상태로 되돌립니다.
function resetAllDecorations() {
  decorationState.items = [];
  decorationState.selectedItemId = null;
  decorationState.brushSize = 8;
  decorationState.eraserSize = 8;
  decorationState.brushColor = "#ff0000";
  decorationState.titleColor = "#24231f";
  decorationState.dateColor = "#77746e";
  decorationState.filterIntensity.dreamy = 50;
  decorationState.filterIntensity.noise = 50;
  decorationElements.dreamIntensity.value = "50";
  decorationElements.noiseIntensity.value = "50";
  decorationElements.dreamIntensityValue.textContent = "50%";
  decorationElements.noiseIntensityValue.textContent = "50%";
  selectBrushColor("#ff0000");
  setBrushPaletteOpen(false);
  selectDrawingMode("brush");
  selectFrameColorTarget("title");
  updateTransformControls();
  decorationElements.frameOptions.querySelectorAll(".frame-option").forEach(
    // 전체 초기화 뒤 프레임 선택 표시를 지웁니다.
    function (button) {
      button.classList.remove("active");
    }
  );
  decorationElements.stickerOptions.querySelectorAll(".sticker-option").forEach(
    // 전체 초기화 뒤 스티커 선택 표시를 지웁니다.
    function (button) {
      button.classList.remove("active");
    }
  );
  if (decorationState.onBaseChange) {
    decorationState.onBaseChange({ resetFilter: true });
  }
  decorationElements.editorStatus.textContent = "전체 꾸미기를 초기화했어요.";
}

// 편집 도구의 화면 요소와 동작을 연결하고 결과 합성 기능을 제공합니다.
function initDecorationEditor(options) {
  const missingElements = Object.keys(decorationElements).filter(
    // 편집 기능에 필요한 모든 화면 요소가 있는지 확인합니다.
    function (name) {
      return !decorationElements[name];
    }
  );
  if (missingElements.length > 0) {
    throw new Error("꾸미기 화면 요소를 찾지 못했어요: " + missingElements.join(", "));
  }
  if (!options || typeof options.onChange !== "function") {
    throw new Error("꾸미기 결과를 앱에 전달할 연결이 준비되지 않았어요.");
  }
  decorationState.onChange = options.onChange;
  decorationState.onBaseChange = options.onBaseChange;
  if (typeof decorationState.onBaseChange !== "function") {
    throw new Error("필터와 프레임 글씨를 결과 사진에 적용할 연결이 준비되지 않았어요.");
  }
  createFrameOptions();
  createStickerOptions();

  decorationElements.tabs.addEventListener("click",
    // 누른 탭에 해당하는 도구 메뉴를 보여 줍니다.
    function (event) {
      const tab = event.target.closest(".editor-tab");
      if (tab) {
        selectEditorTab(tab.dataset.panel.replace("panel-", ""));
      }
    }
  );
  decorationElements.brushMode.addEventListener("click",
    // 브러쉬를 그리기 도구로 선택합니다.
    function () {
      selectDrawingMode("brush");
    }
  );
  decorationElements.brushColorToggle.addEventListener("click",
    // 브러쉬 색상 버튼으로 팔레트를 펼치거나 접습니다.
    function () {
      const isOpen = !decorationElements.brushPalette.classList.contains("hidden");
      setBrushPaletteOpen(!isOpen);
    }
  );
  decorationElements.eraserMode.addEventListener("click",
    // 지우개를 그리기 도구로 선택합니다.
    function () {
      selectDrawingMode("eraser");
    }
  );
  decorationElements.frameColorTargets.forEach(
    // 색상 대상을 고르면 제목이나 날짜 글씨 색 편집으로 전환합니다.
    function (button) {
      button.dataset.colorTarget = button.id === "frame-title-target"
        ? "title"
        : "date";
      button.addEventListener("click",
        // 선택한 프레임 색상 대상을 팔레트에 적용합니다.
        function () {
          selectFrameColorTarget(button.dataset.colorTarget);
        }
      );
    }
  );
  decorationElements.frameColorPalette.querySelectorAll(".frame-color-swatch").forEach(
    // 프레임 색상 팔레트의 칩마다 제목 또는 날짜 글씨 색을 바꿉니다.
    function (swatch) {
      swatch.style.setProperty("--swatch-color", swatch.dataset.color);
      swatch.setAttribute("aria-pressed", "false");
      swatch.addEventListener("click",
        // 선택한 색상을 현재 프레임 색상 대상에 적용합니다.
        function () {
          selectFrameColor(swatch.dataset.color);
        }
      );
    }
  );
  decorationElements.dreamIntensity.addEventListener("input",
    // 몽환 효과의 강도를 저장하고 사진 결과를 다시 만듭니다.
    function () {
      decorationState.filterIntensity.dreamy = Number(decorationElements.dreamIntensity.value);
      decorationElements.dreamIntensityValue.textContent = decorationElements.dreamIntensity.value + "%";
      decorationState.onBaseChange();
    }
  );
  decorationElements.noiseIntensity.addEventListener("input",
    // 노이즈 효과의 강도를 저장하고 사진 결과를 다시 만듭니다.
    function () {
      decorationState.filterIntensity.noise = Number(decorationElements.noiseIntensity.value);
      decorationElements.noiseIntensityValue.textContent = decorationElements.noiseIntensity.value + "%";
      decorationState.onBaseChange();
    }
  );
  decorationElements.brushColor.addEventListener("input",
    // 사용자가 고른 색을 다음 브러쉬 선에 적용합니다.
    function () {
      selectBrushColor(decorationElements.brushColor.value);
    }
  );
  decorationElements.brushPalette.querySelectorAll(".brush-swatch").forEach(
    // 색상 칩마다 눌렀을 때 해당 색을 브러쉬에 적용합니다.
    function (swatch) {
      swatch.style.setProperty("--swatch-color", swatch.dataset.color);
      swatch.setAttribute("aria-pressed", "false");
      swatch.addEventListener("click",
        // 선택한 팔레트 색을 다음 브러쉬 선에 사용합니다.
        function () {
          selectBrushColor(swatch.dataset.color);
        }
      );
    }
  );
  decorationElements.sizeDown.addEventListener("click",
    // 크기 줄이기 버튼을 현재 편집 도구에 적용합니다.
    function () {
      changeItemSize(-1);
    }
  );
  decorationElements.sizeUp.addEventListener("click",
    // 크기 키우기 버튼을 현재 편집 도구에 적용합니다.
    function () {
      changeItemSize(1);
    }
  );
  decorationElements.rotateLeft.addEventListener("click",
    // 선택한 스티커를 왼쪽으로 기울입니다.
    function () {
      rotateSelectedSticker(-1);
    }
  );
  decorationElements.rotateRight.addEventListener("click",
    // 선택한 스티커를 오른쪽으로 기울입니다.
    function () {
      rotateSelectedSticker(1);
    }
  );
  decorationElements.clearButton.addEventListener("click",
    // 프레임부터 그리기까지 모든 편집 내용을 초기화합니다.
    function () {
      resetAllDecorations();
    }
  );
  decorationElements.resetCurrentButton.addEventListener("click",
    // 현재 선택한 편집 탭에 해당하는 내용만 초기화합니다.
    function () {
      resetCurrentTool();
    }
  );
  decorationElements.trash.addEventListener("click",
    // 쓰레기통을 누르면 현재 선택한 스티커 또는 프레임을 삭제합니다.
    function () {
      if (decorationState.selectedItemId) {
        removeMovableItem(decorationState.selectedItemId);
      } else {
        decorationElements.editorStatus.textContent = "먼저 삭제할 스티커를 선택해 주세요.";
      }
    }
  );
  decorationElements.overlay.addEventListener("pointerdown", onDecorationPointerDown);
  decorationElements.overlay.addEventListener("pointermove", onDecorationPointerMove);
  decorationElements.overlay.addEventListener("pointerup", finishPointerAction);
  decorationElements.overlay.addEventListener("pointercancel", finishPointerAction);
  selectBrushColor(decorationState.brushColor);
  setBrushPaletteOpen(false);
  selectFrameColorTarget("title");
  selectEditorTab("frame");
  selectDrawingMode("brush");

  return {
    // 새 필터 프레임을 편집 바탕으로 지정하고 기존 스티커와 선을 다시 표시합니다.
    setBaseCanvas: function (canvas) {
      if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 0 || canvas.height <= 0) {
        throw new Error("꾸미기 바탕으로 사용할 사진이 올바르지 않아요.");
      }
      decorationState.baseCanvas = canvas;
      decorationElements.overlay.width = canvas.width;
      decorationElements.overlay.height = canvas.height;
      drawDecorations();
      updateTransformControls();
    },
    // 필터 강도와 글씨 색을 프레임을 만드는 함수에 전달할 설정으로 돌려줍니다.
    getFrameOptions: function () {
      return {
        titleColor: decorationState.titleColor,
        dateColor: decorationState.dateColor
      };
    },
    // 선택된 신규 효과에 저장된 강도를 돌려줍니다.
    getFilterIntensity: function (filterName) {
      if (filterName === "dreamy") {
        return decorationState.filterIntensity.dreamy;
      }
      if (filterName === "noise") {
        return decorationState.filterIntensity.noise;
      }
      return 0;
    },
    // 현재 탭의 초기화 버튼 동작을 호출 화면에서 연결할 수 있게 제공합니다.
    resetCurrent: function () {
      resetCurrentTool();
    },
    // 편집 바탕과 꾸미기 캔버스를 한 장의 새 사진으로 합칩니다.
    compose: function () {
      if (!decorationState.baseCanvas) {
        throw new Error("꾸미기 바탕 사진이 준비되지 않았어요.");
      }
      const result = document.createElement("canvas");
      result.width = decorationState.baseCanvas.width;
      result.height = decorationState.baseCanvas.height;
      const context = result.getContext("2d");
      if (!context) {
        throw new Error("꾸민 사진을 저장할 화면을 만들지 못했어요.");
      }
      context.drawImage(decorationState.baseCanvas, 0, 0);
      context.drawImage(decorationElements.overlay, 0, 0);
      return result;
    },
    // 전체 촬영 결과를 초기화할 때 꾸미기 기록과 편집 바탕을 비웁니다.
    reset: function () {
      decorationState.items = [];
      decorationState.baseCanvas = null;
      decorationState.selectedItemId = null;
      decorationState.pointerAction = null;
      decorationState.titleColor = "#24231f";
      decorationState.dateColor = "#77746e";
      decorationState.filterIntensity.dreamy = 50;
      decorationState.filterIntensity.noise = 50;
      decorationElements.overlay.width = 0;
      decorationElements.overlay.height = 0;
      decorationState.drawingCanvas.width = 0;
      decorationState.drawingCanvas.height = 0;
      decorationState.brushSize = 8;
      decorationState.eraserSize = 8;
      decorationElements.dreamIntensity.value = "50";
      decorationElements.noiseIntensity.value = "50";
      decorationElements.dreamIntensityValue.textContent = "50%";
      decorationElements.noiseIntensityValue.textContent = "50%";
      selectBrushColor("#ff0000");
      selectFrameColorTarget("title");
      selectEditorTab("frame");
      selectDrawingMode("brush");
      decorationElements.editorStatus.textContent = "사진을 손가락이나 마우스로 그려 보세요.";
      decorationElements.frameOptions.querySelectorAll(".frame-option").forEach(
        // 새 촬영을 시작할 수 있도록 프레임 선택 표시를 지웁니다.
        function (button) {
          button.classList.remove("active");
        }
      );
      decorationElements.stickerOptions.querySelectorAll(".sticker-option").forEach(
        // 새 촬영을 시작할 수 있도록 스티커 선택 표시를 지웁니다.
        function (button) {
          button.classList.remove("active");
        }
      );
      updateTransformControls();
    }
  };
}
