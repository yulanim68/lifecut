// 기기 현지 날짜를 YYYY-MM-DD 형식으로 표시합니다.
function formatDeviceDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("날짜 정보가 올바르지 않아요. 날짜를 확인한 뒤 다시 시도해 주세요.");
  }

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// 촬영 순서대로 캔버스를 중앙 cover 방식으로 배치한 흰 세로 프레임을 만듭니다.
function makeStrip(shots) {
  if (!Array.isArray(shots) || (shots.length !== 2 && shots.length !== 4)) {
    throw new Error("사진은 촬영 순서대로 2장 또는 4장을 준비해 주세요.");
  }

  for (const shot of shots) {
    if (
      typeof HTMLCanvasElement === "undefined" ||
      !(shot instanceof HTMLCanvasElement) ||
      shot.width <= 0 ||
      shot.height <= 0
    ) {
      throw new Error("촬영 사진이 올바른 캔버스가 아니에요. 다시 촬영해 주세요.");
    }
  }

  const strip = document.createElement("canvas");
  let photoWidth = 0;
  for (const shot of shots) {
    photoWidth = Math.max(photoWidth, shot.width);
  }
  const scale = photoWidth / 660;
  const padding = 30 * scale;
  const stripWidth = photoWidth + padding * 2;
  const gap = 20 * scale;
  const photoHeight = photoWidth * 3 / 4;
  const footerHeight = 112 * scale;
  const topPadding = 30 * scale;
  strip.width = stripWidth;
  strip.height = topPadding + shots.length * photoHeight + (shots.length - 1) * gap + footerHeight;

  const context = strip.getContext("2d");
  if (!context) {
    throw new Error("세로 프레임을 만들 화면을 준비하지 못했어요. 최신 브라우저에서 다시 시도해 주세요.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, strip.width, strip.height);

  shots.forEach(
    // 각 사진을 입력 순서대로 프레임의 사진 칸에 배치합니다.
    function (shot, index) {
      const targetX = padding;
      const targetY = topPadding + index * (photoHeight + gap);
      const targetRatio = photoWidth / photoHeight;
      const sourceRatio = shot.width / shot.height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = shot.width;
      let sourceHeight = shot.height;

      if (sourceRatio > targetRatio) {
        sourceWidth = shot.height * targetRatio;
        sourceX = (shot.width - sourceWidth) / 2;
      } else {
        sourceHeight = shot.width / targetRatio;
        sourceY = (shot.height - sourceHeight) / 2;
      }

      try {
        context.drawImage(
          shot,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          targetX,
          targetY,
          photoWidth,
          photoHeight
        );
      } catch (cause) {
        throw new Error("사진을 세로 프레임에 넣지 못했어요. 사진을 다시 촬영해 주세요.");
      }
    }
  );

  const footerTop = topPadding + shots.length * photoHeight + (shots.length - 1) * gap;
  context.fillStyle = "#24231f";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 " + 30 * scale + "px sans-serif";
  context.fillText("인생네컷", stripWidth / 2, footerTop + 40 * scale);
  context.fillStyle = "#77746e";
  context.font = "400 " + 18 * scale + "px sans-serif";
  context.fillText(formatDeviceDate(new Date()), stripWidth / 2, footerTop + 76 * scale);
  return strip;
}
