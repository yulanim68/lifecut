let selectedCutCount = null;
const state = {
  shots: [],
  filter: "original"
};
let cameraStream = null;
let cameraPreparationPromise = null;
let isSessionRunning = false;

const appElements = {
  cutSelectSection: document.getElementById("cut-select-section"),
  cutCount2: document.getElementById("cut-count-2"),
  cutCount4: document.getElementById("cut-count-4"),
  startButton: document.getElementById("start-button"),
  startHint: document.getElementById("start-hint"),
  cameraSection: document.getElementById("camera-section"),
  video: document.getElementById("camera-preview"),
  cameraHint: document.getElementById("camera-hint"),
  captureHint: document.getElementById("capture-hint"),
  progress: document.getElementById("capture-progress"),
  countdown: document.getElementById("countdown"),
  thumbnails: document.getElementById("captured-thumbnails"),
  resultSection: document.getElementById("result-section"),
  resultCanvas: document.getElementById("result-canvas"),
  filters: document.getElementById("filters"),
  resetButton: document.getElementById("reset-button"),
  errorMessage: document.getElementById("error-message"),
  errorTitle: document.getElementById("error-title"),
  errorDescription: document.getElementById("error-description")
};

// 지정한 시간이 지나면 다음 촬영 단계로 이어가도록 기다립니다.
function delay(milliseconds) {
  return new Promise(
    // 시간이 지나면 대기 중인 촬영 단계를 이어갑니다.
    function (resolve) {
      window.setTimeout(resolve, milliseconds);
    }
  );
}

// 요소가 없는 경우에도 콘솔과 가능한 오류 안내 영역에 문제를 알립니다.
function reportMissingElements(missingElements) {
  const message = "필요한 화면 요소를 찾지 못했어요: " + missingElements.join(", ") + ". 페이지 파일을 확인한 뒤 새로고침해 주세요.";
  console.error(message);
  showError(message);
}

// 이전 오류 안내를 화면에서 숨깁니다.
function hideError() {
  if (appElements.errorMessage) {
    appElements.errorMessage.classList.add("hidden");
  }
}

// 현재 필터 상태를 필터 버튼의 선택 모양과 접근성 상태에 반영합니다.
function updateFilterButtons() {
  if (!appElements.filters) {
    return;
  }
  appElements.filters.querySelectorAll(".filter-btn").forEach(
    // 각 버튼의 선택 여부를 현재 필터에 맞춥니다.
    function (button) {
      const isActive = button.dataset.filter === state.filter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  );
}

// FILTERS 목록을 순회해 결과 화면의 필터 선택 버튼을 만듭니다.
function createFilterButtons() {
  appElements.filters.replaceChildren();
  FILTERS.forEach(
    // 필터 하나마다 이름과 접근성 상태가 있는 버튼을 추가합니다.
    function (filter) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-btn";
      button.id = "filter-button-" + filter.name;
      button.dataset.filter = filter.name;
      button.textContent = filter.label;
      button.setAttribute("aria-pressed", String(filter.name === state.filter));
      button.classList.toggle("active", filter.name === state.filter);
      // 선택한 필터를 상태에 저장하고 새 결과 프레임을 즉시 만듭니다.
      button.addEventListener("click", function () {
        state.filter = filter.name;
        updateFilterButtons();
        try {
          renderResult();
        } catch (error) {
          showError(error);
        }
      });
      appElements.filters.appendChild(button);
    }
  );
}

// 카메라와 촬영 오류의 원인 및 다음 행동을 한국어로 안내합니다.
function showError(message) {
  const error = message instanceof Error ? message : new Error(String(message || "알 수 없는 문제가 생겼어요."));
  let title = "촬영을 진행할 수 없어요";
  let description = error.message;

  if (error.code === "CAMERA_UNSUPPORTED") {
    title = "카메라를 사용할 수 없어요";
    description = error.message;
  } else if (error.code === "INSECURE_CONTEXT") {
    title = "안전한 연결이 필요해요";
    description = error.message;
  } else if (error.code === "CAMERA_PERMISSION_DENIED") {
    title = "카메라 권한이 필요해요";
    description = error.message;
  } else if (error.code === "CAMERA_NOT_FOUND") {
    title = "카메라를 찾지 못했어요";
    description = error.message;
  } else if (error.code === "CAMERA_IN_USE") {
    title = "카메라가 사용 중이에요";
    description = error.message;
  } else if (error.code === "VIDEO_NOT_READY" || error.code === "VIDEO_SIZE_TIMEOUT" || error.code === "CAMERA_PLAYBACK_FAILED") {
    title = "카메라 영상이 준비되지 않았어요";
    description = error.message;
  } else if (error.code === "CANVAS_UNAVAILABLE") {
    title = "사진을 만들지 못했어요";
    description = error.message;
  } else if (error.code === "CAPTURE_FAILED") {
    title = "사진을 촬영하지 못했어요";
    description = error.message;
  } else if (error.code === "CAMERA_CONSTRAINT" || error.code === "CAMERA_DEVICE_ERROR") {
    title = "카메라 장치에 문제가 있어요";
    description = error.message;
  } else if (!description || description === "알 수 없는 문제가 생겼어요.") {
    description = "카메라 연결과 권한을 확인한 뒤 촬영 시작을 다시 눌러 주세요.";
  } else if (!/[가-힣]/.test(description)) {
    description = "촬영 중 문제가 생겼어요. 카메라 권한과 연결을 확인한 뒤 다시 시도해 주세요.";
  } else {
    description += " 문제가 계속되면 카메라 권한과 연결을 확인한 뒤 다시 시도해 주세요.";
  }

  if (appElements.errorTitle && appElements.errorDescription && appElements.errorMessage) {
    appElements.errorTitle.textContent = title;
    appElements.errorDescription.textContent = description;
    appElements.errorMessage.classList.remove("hidden");
  } else {
    console.error(title + ": " + description);
  }
}

// 화면에서 선택한 컷 수를 저장하고 선택 버튼의 모양과 접근성 상태를 갱신합니다.
function selectCutCount(count) {
  if (isSessionRunning) {
    return;
  }
  if (count !== 2 && count !== 4) {
    showError("2컷 또는 4컷 중 하나를 선택해 주세요.");
    return;
  }

  selectedCutCount = count;
  appElements.cutCount2.classList.toggle("is-selected", count === 2);
  appElements.cutCount2.setAttribute("aria-pressed", String(count === 2));
  appElements.cutCount4.classList.toggle("is-selected", count === 4);
  appElements.cutCount4.setAttribute("aria-pressed", String(count === 4));
  appElements.startHint.textContent = count + "컷 촬영을 준비했어요. 시작 버튼을 한 번 눌러 주세요.";
  hideError();
}

// 기존 카메라 영상이 없으면 준비하고, 동시에 중복으로 카메라 권한을 요청하지 않습니다.
async function prepareCamera() {
  if (
    cameraStream &&
    cameraStream.getTracks().some(
      // 아직 종료되지 않은 트랙인지 확인합니다.
      function (track) {
        return track.readyState !== "ended";
      }
    )
  ) {
    return cameraStream;
  }
  if (cameraPreparationPromise) {
    return cameraPreparationPromise;
  }

  cameraPreparationPromise = startCamera(appElements.video);
  try {
    cameraStream = await cameraPreparationPromise;
    return cameraStream;
  } finally {
    cameraPreparationPromise = null;
  }
}

// 사용이 끝난 카메라 스트림의 모든 트랙을 종료하고 영상 연결을 해제합니다.
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(
      // 스트림이 가진 각 트랙을 종료합니다.
      function (track) {
        track.stop();
      }
    );
  }
  cameraStream = null;
  if (appElements.video) {
    appElements.video.pause();
    appElements.video.srcObject = null;
  }
}

// 썸네일 목록에 비어 있음 안내를 다시 표시합니다.
function clearThumbnails() {
  while (appElements.thumbnails.firstChild) {
    appElements.thumbnails.removeChild(appElements.thumbnails.firstChild);
  }
  const emptyLabel = document.createElement("p");
  emptyLabel.id = "thumbnail-empty";
  emptyLabel.className = "thumbnail-empty";
  emptyLabel.textContent = "아직 촬영한 사진이 없어요.";
  appElements.thumbnails.appendChild(emptyLabel);
}

// 촬영한 캔버스를 작은 이미지로 변환해 촬영 순서대로 추가합니다.
function addThumbnail(shot, index) {
  const thumbnail = document.createElement("img");
  thumbnail.id = "shot-preview-" + (index + 1);
  thumbnail.className = "thumbnail-item";
  thumbnail.alt = (index + 1) + "번째 촬영 사진";
  thumbnail.src = shot.toDataURL("image/png");

  if (index === 0) {
    appElements.thumbnails.replaceChildren();
  }
  appElements.thumbnails.appendChild(thumbnail);
}

// 선택한 컷 수와 카메라 상태를 확인한 뒤 자동 촬영 세션을 한 번 시작합니다.
async function startSession() {
  if (isSessionRunning) {
    return;
  }
  if (selectedCutCount !== 2 && selectedCutCount !== 4) {
    showError("촬영 전에 2컷 또는 4컷을 먼저 선택해 주세요.");
    return;
  }

  isSessionRunning = true;
  state.shots = [];
  appElements.startButton.disabled = true;
  appElements.cutCount2.disabled = true;
  appElements.cutCount4.disabled = true;
  appElements.cutSelectSection.classList.add("hidden");
  appElements.resultSection.classList.add("hidden");
  appElements.cameraSection.classList.remove("hidden");
  appElements.cameraHint.textContent = "카메라를 준비하고 있어요.";
  appElements.captureHint.textContent = "카운트다운이 끝나면 자동으로 촬영돼요.";
  appElements.progress.textContent = "1 / " + selectedCutCount;
  appElements.countdown.classList.add("hidden");
  hideError();

  try {
    await prepareCamera();
    appElements.cameraHint.textContent = "실시간 화면이 준비됐어요.";
    await runCaptureSequence();
  } catch (error) {
    stopCamera();
    appElements.countdown.classList.add("hidden");
    appElements.cameraSection.classList.add("hidden");
    appElements.cutSelectSection.classList.remove("hidden");
    appElements.startHint.textContent = "문제를 확인한 뒤 촬영 시작을 다시 눌러 주세요.";
    showError(error);
  } finally {
    isSessionRunning = false;
    appElements.startButton.disabled = false;
    appElements.cutCount2.disabled = false;
    appElements.cutCount4.disabled = false;
  }
}

// 선택한 컷마다 카운트다운과 촬영을 반복하고 완성된 프레임을 결과 화면에 표시합니다.
async function runCaptureSequence() {
  for (let index = 0; index < selectedCutCount; index += 1) {
    appElements.progress.textContent = (index + 1) + " / " + selectedCutCount;
    appElements.captureHint.textContent = (index + 1) + "번째 사진을 준비하고 있어요.";
    await runCountdown();

    const shot = captureShot(appElements.video);
    const captureCompletedAt = Date.now();
    state.shots.push(shot);
    addThumbnail(shot, index);
    appElements.captureHint.textContent = (index + 1) + "번째 사진을 촬영했어요.";

    if (index < selectedCutCount - 1) {
      const elapsedMilliseconds = Date.now() - captureCompletedAt;
      const remainingMilliseconds = Math.max(0, 700 - elapsedMilliseconds);
      if (remainingMilliseconds > 0) {
        await delay(remainingMilliseconds);
      }
    }
  }

  state.filter = "original";
  updateFilterButtons();
  renderResult();
  stopCamera();
}

// 화면에 5, 4, 3, 2, 1을 각 1초 동안 표시합니다.
async function runCountdown() {
  appElements.countdown.classList.remove("hidden");
  for (let remaining = 5; remaining >= 1; remaining -= 1) {
    appElements.countdown.textContent = String(remaining);
    await delay(1000);
  }
  appElements.countdown.textContent = "";
  appElements.countdown.classList.add("hidden");
}

// 완성된 세로 프레임을 결과 캔버스에 복사해 결과 화면을 보여 줍니다.
function showPreview(strip) {
  if (!strip || strip.width <= 0 || strip.height <= 0) {
    throw new Error("완성된 사진 프레임이 없어요. 다시 촬영해 주세요.");
  }

  const context = appElements.resultCanvas.getContext("2d");
  if (!context) {
    throw new Error("결과 화면을 준비하지 못했어요. 최신 브라우저에서 다시 시도해 주세요.");
  }

  appElements.resultCanvas.width = strip.width;
  appElements.resultCanvas.height = strip.height;
  context.drawImage(strip, 0, 0);
  appElements.cameraSection.classList.add("hidden");
  appElements.cutSelectSection.classList.add("hidden");
  appElements.resultSection.classList.remove("hidden");
  hideError();
}

// 원본 촬영 사진에 선택된 필터를 새로 적용해 프레임 결과를 다시 만듭니다.
function renderResult() {
  try {
    const filteredShots = state.shots.map(
      // 매번 원본 촬영 캔버스에서 별도의 필터 결과를 만듭니다.
      function (shot) {
        return applyFilter(shot, state.filter);
      }
    );
    const strip = makeStrip(filteredShots);
    updateFilterButtons();
    showPreview(strip);
  } catch (cause) {
    const context = appElements.resultCanvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, appElements.resultCanvas.width, appElements.resultCanvas.height);
    }
    appElements.resultCanvas.width = 0;
    appElements.resultCanvas.height = 0;
    const detail = cause && cause.message ? " " + cause.message : "";
    throw new Error("필터 적용 또는 결과 만들기에 실패했어요." + detail);
  }
}

// 선택, 촬영 사진, 썸네일과 결과를 비우고 카메라를 다시 준비합니다.
async function resetSession() {
  if (isSessionRunning) {
    return;
  }

  stopCamera();
  selectedCutCount = null;
  state.shots = [];
  state.filter = "original";
  updateFilterButtons();
  appElements.cutCount2.classList.remove("is-selected");
  appElements.cutCount2.setAttribute("aria-pressed", "false");
  appElements.cutCount4.classList.remove("is-selected");
  appElements.cutCount4.setAttribute("aria-pressed", "false");
  appElements.startHint.textContent = "준비가 되면 한 번 눌러 촬영을 시작해요.";
  appElements.progress.textContent = "0 / 0";
  appElements.countdown.textContent = "";
  appElements.countdown.classList.add("hidden");
  appElements.captureHint.textContent = "카운트다운이 끝나면 자동으로 촬영돼요.";
  clearThumbnails();

  const context = appElements.resultCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, appElements.resultCanvas.width, appElements.resultCanvas.height);
  }
  appElements.resultCanvas.width = 0;
  appElements.resultCanvas.height = 0;
  appElements.resultSection.classList.add("hidden");
  appElements.cameraSection.classList.add("hidden");
  appElements.cutSelectSection.classList.remove("hidden");
  hideError();
  appElements.cameraHint.textContent = "카메라를 다시 준비하고 있어요.";

  try {
    await prepareCamera();
    appElements.cameraHint.textContent = "실시간 화면이 준비됐어요.";
  } catch (error) {
    showError(error);
  }
}

// 컷 선택과 버튼 동작을 연결한 다음 페이지 진입 시 카메라를 준비합니다.
async function initApp() {
  const requiredElements = [
    "cutSelectSection",
    "cutCount2",
    "cutCount4",
    "startButton",
    "startHint",
    "cameraSection",
    "video",
    "cameraHint",
    "captureHint",
    "progress",
    "countdown",
    "thumbnails",
    "resultSection",
    "resultCanvas",
    "filters",
    "resetButton",
    "errorMessage",
    "errorTitle",
    "errorDescription"
  ];
  const missingElements = requiredElements.filter(
    // 요구된 화면 요소가 있는지 확인합니다.
    function (name) {
      return !appElements[name];
    }
  );
  if (missingElements.length > 0) {
    reportMissingElements(missingElements);
    return;
  }

  appElements.cutCount2.addEventListener("click", onSelectTwoCuts);
  appElements.cutCount4.addEventListener("click", onSelectFourCuts);
  appElements.startButton.addEventListener("click", onStartButtonClick);
  appElements.resetButton.addEventListener("click", onResetButtonClick);
  createFilterButtons();
  selectedCutCount = null;
  state.shots = [];
  state.filter = "original";
  appElements.cutCount2.classList.remove("is-selected");
  appElements.cutCount2.setAttribute("aria-pressed", "false");
  appElements.cutCount4.classList.remove("is-selected");
  appElements.cutCount4.setAttribute("aria-pressed", "false");
  appElements.cutSelectSection.classList.remove("hidden");
  appElements.cameraSection.classList.add("hidden");
  appElements.resultSection.classList.add("hidden");
  clearThumbnails();

  try {
    appElements.cameraHint.textContent = "카메라를 준비하고 있어요.";
    await prepareCamera();
    appElements.cameraHint.textContent = "실시간 화면이 준비됐어요.";
  } catch (error) {
    showError(error);
  }
}

// 2컷 버튼의 선택 상태를 반영합니다.
function onSelectTwoCuts() {
  selectCutCount(2);
}

// 4컷 버튼의 선택 상태를 반영합니다.
function onSelectFourCuts() {
  selectCutCount(4);
}

// 시작 버튼을 한 번 눌렀을 때 전체 선택 컷 수 촬영을 시작합니다.
function onStartButtonClick() {
  startSession();
}

// 처음으로 버튼을 눌렀을 때 상태를 초기화하고 카메라를 다시 준비합니다.
function onResetButtonClick() {
  resetSession();
}

initApp();
