// RGB 채널을 반올림한 뒤 0부터 255 사이로 제한합니다.
function clamp(value) {
  if (!Number.isFinite(value)) {
    throw new Error("필터 색상 값이 올바르지 않아요.");
  }
  return Math.min(255, Math.max(0, Math.round(value)));
}

const FILTERS = [
  {
    name: "original",
    label: "원본",
    // 원본 RGB 값을 그대로 돌려줍니다.
    apply: function (r, g, b) {
      return [clamp(r), clamp(g), clamp(b)];
    }
  },
  {
    name: "grayscale",
    label: "흑백",
    // 밝기 공식을 사용해 세 RGB 채널을 같은 값으로 맞춥니다.
    apply: function (r, g, b) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const value = clamp(gray);
      return [value, value, value];
    }
  },
  {
    name: "sepia",
    label: "세피아",
    // 표준 세피아 계수로 따뜻한 갈색 계열의 RGB 값을 계산합니다.
    apply: function (r, g, b) {
      return [
        clamp(0.393 * r + 0.769 * g + 0.189 * b),
        clamp(0.349 * r + 0.686 * g + 0.168 * b),
        clamp(0.272 * r + 0.534 * g + 0.131 * b)
      ];
    }
  },
  {
    name: "warm",
    label: "따뜻하게",
    // 빨강과 초록을 높이고 파랑을 낮춥니다.
    apply: function (r, g, b) {
      return [clamp(r + 20), clamp(g + 8), clamp(b - 12)];
    }
  },
  {
    name: "cool",
    label: "시원하게",
    // 빨강을 낮추고 초록과 파랑을 높입니다.
    apply: function (r, g, b) {
      return [clamp(r - 12), clamp(g + 4), clamp(b + 20)];
    }
  },
  {
    name: "bright",
    label: "화사하게",
    // 세 채널의 밝기를 같은 양만큼 높입니다.
    apply: function (r, g, b) {
      return [clamp(r + 30), clamp(g + 30), clamp(b + 30)];
    }
  }
];

// 원본 캔버스를 바꾸지 않고 같은 크기의 새 캔버스에 필터 결과를 그립니다.
function applyFilter(canvas, filterName) {
  const filter = FILTERS.find(
    // 지정된 이름과 일치하는 필터 정의를 찾습니다.
    function (item) {
      return item.name === filterName;
    }
  );
  if (!filter) {
    throw new Error("선택한 필터를 찾지 못했어요.");
  }
  if (
    typeof HTMLCanvasElement === "undefined" ||
    !(canvas instanceof HTMLCanvasElement) ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    throw new Error("필터를 적용할 촬영 사진이 올바르지 않아요.");
  }

  const sourceContext = canvas.getContext("2d");
  if (!sourceContext) {
    throw new Error("촬영 사진의 픽셀을 읽을 화면을 준비하지 못했어요.");
  }

  let imageData;
  try {
    imageData = sourceContext.getImageData(0, 0, canvas.width, canvas.height);
  } catch (cause) {
    throw new Error("촬영 사진의 픽셀을 읽지 못했어요. 사진을 다시 촬영해 주세요.");
  }

  const filteredCanvas = document.createElement("canvas");
  filteredCanvas.width = canvas.width;
  filteredCanvas.height = canvas.height;
  const filteredContext = filteredCanvas.getContext("2d");
  if (!filteredContext) {
    throw new Error("필터 결과를 만들 화면을 준비하지 못했어요. 최신 브라우저에서 다시 시도해 주세요.");
  }

  try {
    for (let index = 0; index < imageData.data.length; index += 4) {
      const [red, green, blue] = filter.apply(
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2]
      );
      imageData.data[index] = red;
      imageData.data[index + 1] = green;
      imageData.data[index + 2] = blue;
    }
    filteredContext.putImageData(imageData, 0, 0);
  } catch (cause) {
    throw new Error("필터를 사진에 적용하지 못했어요. 다른 필터를 선택하거나 다시 촬영해 주세요.");
  }

  return filteredCanvas;
}
