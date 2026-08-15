"use client";

import { useEffect, useMemo, useState } from "react";

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  const days = Math.round(diff / 86400000);

  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;

  return `D+${Math.abs(days)}`;
}

function formatTime(value) {
  if (!value) return "";

  return String(value).slice(0, 5);
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);

  const [nicknameInput, setNicknameInput] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("meetings");

  const [step, setStep] = useState(0);

  // ==========================================
  // DATA
  // ==========================================

  const [meetings, setMeetings] = useState([]);
  const [places, setPlaces] = useState([]);
  const [todos, setTodos] = useState([]);

  // ==========================================
  // MEETING FORM
  // ==========================================

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  const [addToKakaoCalendar, setAddToKakaoCalendar] =
    useState(true);

  const [selectedSavedPlace, setSelectedSavedPlace] =
    useState(null);

  // ==========================================
  // PLACE FORM
  // ==========================================

  const [placeName, setPlaceName] = useState("");
  const [placeArea, setPlaceArea] = useState("");
  const [placeMemo, setPlaceMemo] = useState("");

  const [placeCategory, setPlaceCategory] =
    useState("맛집");

  const [placeFilter, setPlaceFilter] =
    useState("ALL");

  const [statusTarget, setStatusTarget] =
    useState(null);

  // ==========================================
  // TODO
  // ==========================================

  const [todoInput, setTodoInput] = useState("");

  const [addToKakaoTask, setAddToKakaoTask] =
    useState(true);

  // ==========================================
  // INIT
  // ==========================================

  useEffect(() => {
    loadAllData();
  }, []);

  async function apiPost(payload) {
    const response = await fetch("/api/data", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "요청 처리 중 오류가 발생했어요."
      );
    }

    return result;
  }

  async function loadAllData() {
    try {
      setLoading(true);

      const meResponse = await fetch(
        "/api/kakao/me",
        {
          cache: "no-store",
        }
      );

      const me = await meResponse.json();

      if (!me.loggedIn || !me.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/data", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "데이터를 불러오지 못했어요."
        );
      }

      setUser(data.user);

      setNicknameInput(
        data.user?.nickname || ""
      );

      setMeetings(
        (data.meetings || []).map((item) => ({
          id: item.id,
          title: item.title,
          date: item.meeting_date,
          startTime: formatTime(
            item.start_time
          ),
          endTime: formatTime(
            item.end_time
          ),
          plan: item.plan,
          place: item.place,
          completed: item.completed,
          kakaoEventId:
            item.kakao_event_id,
        }))
      );

      setPlaces(data.places || []);

      setTodos(data.todos || []);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOGIN
  // ==========================================

  function loginWithKakao() {
    window.location.href =
      "/api/kakao/login";
  }

  async function logout() {
    try {
      await fetch("/api/kakao/logout", {
        method: "POST",
      });

      setUser(null);
      setMeetings([]);
      setPlaces([]);
      setTodos([]);

      window.location.replace("/");
    } catch (error) {
      console.error(error);
      alert("로그아웃에 실패했어요.");
    }
  }

  // ==========================================
  // NICKNAME
  // ==========================================

  async function saveNickname() {
    const nickname =
      nicknameInput.trim();

    if (!nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      await apiPost({
        action: "saveNickname",
        nickname,
      });

      setUser((prev) => ({
        ...prev,
        nickname,
      }));
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // MEETING
  // ==========================================

  function resetMeetingForm() {
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlan("");
    setPlace("");

    setSelectedSavedPlace(null);

    setAddToKakaoCalendar(true);
  }

  async function createMeeting() {
    if (!title.trim()) {
      alert("약속 이름을 입력해주세요.");
      return;
    }

    if (!date) {
      alert("날짜를 정해주세요.");
      return;
    }

    if (!startTime) {
      alert("시작 시간을 정해주세요.");
      return;
    }

    try {
      setSaving(true);

      const result = await apiPost({
        action: "createMeeting",

        meeting: {
          title: title.trim(),
          date,
          startTime,
          endTime,
          plan: plan.trim(),
          place: place.trim(),
        },

        addToKakao:
          addToKakaoCalendar,
      });

      await loadAllData();

      resetMeetingForm();

      setStep(0);
      setActiveTab("meetings");

      if (addToKakaoCalendar) {
        if (result.calendarSynced) {
          alert(
            "약속을 만들었어요!\n톡캘린더에도 추가했어요 🟡"
          );
        } else {
          alert(
            `약속은 저장됐어요.\n톡캘린더 연결은 실패했어요.${
              result.calendarError
                ? `\n${result.calendarError}`
                : ""
            }`
          );
        }
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleMeeting(meeting) {
    try {
      await apiPost({
        action: "toggleMeeting",
        id: meeting.id,
        completed:
          !meeting.completed,
      });

      await loadAllData();

      // PLACES에서 가져온 장소라면
      // 완료 후 상태 선택창 보여주기
      if (
        !meeting.completed &&
        meeting.place
      ) {
        const matchedPlace =
          places.find(
            (item) =>
              item.name ===
                meeting.place &&
              item.status ===
                "가고싶어"
          );

        if (matchedPlace) {
          setStatusTarget(
            matchedPlace
          );
        }
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteMeeting(id) {
    if (
      !window.confirm(
        "이 약속을 삭제할까요?"
      )
    ) {
      return;
    }

    try {
      await apiPost({
        action: "deleteMeeting",
        id,
      });

      await loadAllData();
    } catch (error) {
      alert(error.message);
    }
  }

  // ==========================================
  // PLACES
  // ==========================================

  async function createPlace() {
    const cleanName =
      placeName.trim();

    if (!cleanName) {
      alert("장소 이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      await apiPost({
        action: "createPlace",

        place: {
          name: cleanName,
          area: placeArea.trim(),
          memo: placeMemo.trim(),
          category:
            placeCategory,
          status: "가고싶어",
        },
      });

      setPlaceName("");
      setPlaceArea("");
      setPlaceMemo("");
      setPlaceCategory("맛집");

      await loadAllData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePlaceStatus(
    placeId,
    status
  ) {
    try {
      await apiPost({
        action:
          "changePlaceStatus",
        id: placeId,
        status,
      });

      setStatusTarget(null);

      await loadAllData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deletePlace(id) {
    if (
      !window.confirm(
        "이 장소를 삭제할까요?"
      )
    ) {
      return;
    }

    try {
      await apiPost({
        action: "deletePlace",
        id,
      });

      await loadAllData();
    } catch (error) {
      alert(error.message);
    }
  }

  function makeMeetingFromPlace(
    savedPlace
  ) {
    resetMeetingForm();

    setSelectedSavedPlace(
      savedPlace
    );

    setPlace(savedPlace.name);

    setPlan(
      savedPlace.memo || ""
    );

    setStep(1);
  }

  const filteredPlaces =
    useMemo(() => {
      return places.filter(
        (savedPlace) => {
          if (
            placeFilter === "ALL"
          ) {
            return true;
          }

          if (
            placeFilter === "최애"
          ) {
            return (
              savedPlace.status ===
              "최애"
            );
          }

          if (
            placeFilter ===
            "다녀왔어"
          ) {
            return (
              savedPlace.status ===
                "다녀왔어" ||
              savedPlace.status ===
                "최애"
            );
          }

          return (
            savedPlace.category ===
            placeFilter
          );
        }
      );
    }, [places, placeFilter]);

  // ==========================================
  // TODO
  // ==========================================

  async function createTodo() {
    const cleanTodo =
      todoInput.trim();

    if (!cleanTodo) {
      return;
    }

    try {
      setSaving(true);

      const result = await apiPost({
        action: "createTodo",
        title: cleanTodo,
        addToKakao:
          addToKakaoTask,
      });

      setTodoInput("");

      await loadAllData();

      if (addToKakaoTask) {
        if (result.kakaoSynced) {
          alert(
            "할 일을 저장했어요!\n카카오 내 할 일에도 추가했어요 🟡"
          );
        } else {
          alert(
            `MEET에는 저장됐어요.\n카카오 내 할 일 연결은 실패했어요.${
              result.kakaoError
                ? `\n${result.kakaoError}`
                : ""
            }`
          );
        }
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTodo(todo) {
    try {
      await apiPost({
        action: "toggleTodo",
        id: todo.id,
        completed:
          !todo.completed,
      });

      await loadAllData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteTodo(id) {
    try {
      await apiPost({
        action: "deleteTodo",
        id,
      });

      await loadAllData();
    } catch (error) {
      alert(error.message);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="center-page">
        <h1>MEET</h1>

        <p>
          불러오는 중...
        </p>
      </main>
    );
  }

  // ==========================================
  // LOGIN
  // ==========================================

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-logo">
          <h1>MEET</h1>

          <p>
            어디서 머할까?
          </p>
        </div>

        <div className="login-box">
          <h2>
            같이 약속을 만들어봐요.
          </h2>

          <button
            className="kakao-button"
            onClick={
              loginWithKakao
            }
          >
            카카오로 시작하기
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // NICKNAME
  // ==========================================

  if (!user.nickname) {
    return (
      <main className="nickname-page">
        <p className="step-label">
          WELCOME TO MEET
        </p>

        <h2>
          뭐라고 부르면 될까?
        </h2>

        <p className="nickname-description">
          MEET에서 사용할 닉네임을 정해주세요.
        </p>

        <input
          type="text"
          placeholder="닉네임"
          maxLength={12}
          value={
            nicknameInput
          }
          onChange={(e) =>
            setNicknameInput(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              saveNickname();
            }
          }}
        />

        <button
          onClick={
            saveNickname
          }
          disabled={saving}
        >
          {saving
            ? "저장 중..."
            : "MEET 시작하기"}
        </button>
      </main>
    );
  }

  // ==========================================
  // CREATE MEETING
  // ==========================================

  if (step !== 0) {
    return (
      <main>
        {step === 1 && (
          <section className="create-page">
            <p className="step-label">
              01 / NAME
            </p>

            {selectedSavedPlace && (
              <div className="place-origin-chip">
                <span>
                  {selectedSavedPlace.category}
                </span>

                {selectedSavedPlace.name}
              </div>
            )}

            <h2>
              약속 이름
            </h2>

            <input
              type="text"
              placeholder="예: 데이트하기"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
            />

            <button
              onClick={() =>
                setStep(2)
              }
            >
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() => {
                resetMeetingForm();
                setStep(0);
              }}
            >
              ← 돌아가기
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="create-page">
            <p className="step-label">
              02 / WHEN
            </p>

            <h2>
              언제 만날까?
            </h2>

            <label>
              날짜
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
            />

            <label>
              시작 시간
            </label>

            <input
              type="time"
              value={
                startTime
              }
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
            />

            <label>
              끝나는 시간
            </label>

            <input
              type="time"
              value={endTime}
              onChange={(e) =>
                setEndTime(
                  e.target.value
                )
              }
            />

            <button
              onClick={() =>
                setStep(3)
              }
            >
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() =>
                setStep(1)
              }
            >
              ← 이전
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="create-page">
            <p className="step-label">
              03 / PLAN
            </p>

            <h2>
              뭐 할까?
            </h2>

            <textarea
              placeholder="예: 밥 먹고 전시 보기"
              value={plan}
              onChange={(e) =>
                setPlan(
                  e.target.value
                )
              }
            />

            <button
              onClick={() =>
                setStep(4)
              }
            >
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() =>
                setStep(2)
              }
            >
              ← 이전
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="create-page">
            <p className="step-label">
              04 / PLACE
            </p>

            <h2>
              어디서 만날까?
            </h2>

            <input
              type="text"
              placeholder="예: 성수"
              value={place}
              onChange={(e) =>
                setPlace(
                  e.target.value
                )
              }
            />

            {selectedSavedPlace && (
              <div className="linked-place-card">
                <span>
                  PLACES
                </span>

                <strong>
                  {selectedSavedPlace.name}
                </strong>

                {selectedSavedPlace.area && (
                  <small>
                    {selectedSavedPlace.area}
                  </small>
                )}
              </div>
            )}

            <button
              onClick={() =>
                setStep(5)
              }
            >
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() =>
                setStep(3)
              }
            >
              ← 이전
            </button>
          </section>
        )}

        {step === 5 && (
          <section className="create-page">
            <p className="step-label">
              CONFIRM
            </p>

            <h2>
              이렇게 만날까?
            </h2>

            <div className="confirm-card">
              <div className="confirm-dday">
                {getDday(date)}
              </div>

              <h3>
                {title}
              </h3>

              <p>
                📅 {date}
              </p>

              <p>
                ⏰ {startTime}
                {endTime &&
                  ` ~ ${endTime}`}
              </p>

              {plan && (
                <p>
                  ✦ {plan}
                </p>
              )}

              {place && (
                <p>
                  📍 {place}
                </p>
              )}
            </div>

            <label className="integration-option">
              <input
                type="checkbox"
                checked={
                  addToKakaoCalendar
                }
                onChange={(e) =>
                  setAddToKakaoCalendar(
                    e.target.checked
                  )
                }
              />

              <span>
                톡캘린더에도 추가
              </span>
            </label>

            <button
              onClick={
                createMeeting
              }
              disabled={saving}
            >
              {saving
                ? "만드는 중..."
                : "약속 만들기"}
            </button>

            <button
              className="back-button"
              onClick={() =>
                setStep(4)
              }
            >
              ← 수정하기
            </button>
          </section>
        )}
      </main>
    );
  }

  // ==========================================
  // HOME
  // ==========================================

  return (
    <main>
      <header className="home-header">
        <div>
          <h1>
            MEET
          </h1>

          <p>
            어디서 머할까?
          </p>
        </div>

        <div className="user-area">
          <span>
            {user.nickname}
          </span>

          <button
            className="logout-button"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      </header>

      <nav className="top-tabs">
        <button
          className={
            activeTab === "meetings"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "meetings"
            )
          }
        >
          약속
        </button>

        <button
          className={
            activeTab === "places"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "places"
            )
          }
        >
          PLACES
        </button>

        <button
          className={
            activeTab === "todos"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "todos"
            )
          }
        >
          TODO
        </button>
      </nav>

      {/* =====================================
          MEETINGS
      ===================================== */}

      {activeTab === "meetings" && (
        <>
          <p className="step-label">
            UPCOMING
          </p>

          {meetings.length === 0 && (
            <div className="empty">
              아직 약속이 없어요.
            </div>
          )}

          <section className="meeting-list">
            {meetings.map(
              (meeting) => (
                <div
                  key={
                    meeting.id
                  }
                  className={`meeting-card ${
                    meeting.completed
                      ? "completed"
                      : ""
                  }`}
                >
                  <div className="dday">
                    {getDday(
                      meeting.date
                    )}
                  </div>

                  <div className="meeting-top">
                    <button
                      className="check-button"
                      onClick={() =>
                        toggleMeeting(
                          meeting
                        )
                      }
                    >
                      {meeting.completed
                        ? "✓"
                        : ""}
                    </button>

                    <h2>
                      {
                        meeting.title
                      }
                    </h2>
                  </div>

                  <div className="meeting-info">
                    <p>
                      📅{" "}
                      {meeting.date}
                    </p>

                    <p>
                      ⏰{" "}
                      {
                        meeting.startTime
                      }

                      {meeting.endTime &&
                        ` ~ ${meeting.endTime}`}
                    </p>

                    {meeting.plan && (
                      <p>
                        ✦{" "}
                        {meeting.plan}
                      </p>
                    )}

                    {meeting.place && (
                      <p>
                        📍{" "}
                        {meeting.place}
                      </p>
                    )}
                  </div>

                  {meeting.kakaoEventId && (
                    <div className="sync-chip">
                      ✓ 톡캘린더
                    </div>
                  )}

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteMeeting(
                        meeting.id
                      )
                    }
                  >
                    삭제
                  </button>
                </div>
              )
            )}
          </section>

          <button
            className="new-button"
            onClick={() => {
              resetMeetingForm();
              setStep(1);
            }}
          >
            + 새 약속 만들기
          </button>
        </>
      )}

      {/* =====================================
          PLACES
      ===================================== */}

      {activeTab === "places" && (
        <section>
          <p className="step-label">
            PLACES
          </p>

          <h2 className="section-title">
            우리 어디 가지?
          </h2>

          <p className="places-description">
            맛집, 카페, 공방, 놀거리까지.
            마음에 드는 곳을 모아둬.
          </p>

          <div className="place-create">
            <h3 className="place-form-title">
              새 장소
            </h3>

            <div className="category-selector">
              {[
                "맛집",
                "카페",
                "술",
                "공방",
                "놀거리",
                "쇼핑",
                "여행",
                "기타",
              ].map(
                (category) => (
                  <button
                    type="button"
                    key={
                      category
                    }
                    className={
                      placeCategory ===
                      category
                        ? "category-button selected"
                        : "category-button"
                    }
                    onClick={() =>
                      setPlaceCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <input
              type="text"
              placeholder="장소 이름"
              value={placeName}
              onChange={(e) =>
                setPlaceName(
                  e.target.value
                )
              }
            />

            <input
              type="text"
              placeholder="지역 · 예: 성수"
              value={placeArea}
              onChange={(e) =>
                setPlaceArea(
                  e.target.value
                )
              }
            />

            <textarea
              placeholder="메모 · 예: 트러플 파스타 먹기"
              value={placeMemo}
              onChange={(e) =>
                setPlaceMemo(
                  e.target.value
                )
              }
            />

            <button
              className="save-place-button"
              onClick={
                createPlace
              }
              disabled={saving}
            >
              + 저장
            </button>
          </div>

          <div className="place-filters">
            {[
              "ALL",
              "맛집",
              "카페",
              "공방",
              "놀거리",
              "다녀왔어",
              "최애",
            ].map(
              (filter) => (
                <button
                  type="button"
                  key={filter}
                  className={
                    placeFilter ===
                    filter
                      ? "place-filter active"
                      : "place-filter"
                  }
                  onClick={() =>
                    setPlaceFilter(
                      filter
                    )
                  }
                >
                  {filter === "최애"
                    ? "★ 최애"
                    : filter}
                </button>
              )
            )}
          </div>

          {filteredPlaces.length ===
            0 && (
            <div className="empty">
              아직 여기에 저장된 장소가 없어요.
            </div>
          )}

          <div className="place-list">
            {filteredPlaces.map(
              (savedPlace) => (
                <article
                  className="place-card place-card-v2"
                  key={
                    savedPlace.id
                  }
                >
                  <div className="place-card-top">
                    <span className="place-category">
                      {
                        savedPlace.category
                      }
                    </span>

                    <button
                      type="button"
                      className={`place-status-pill status-${savedPlace.status}`}
                      onClick={() =>
                        setStatusTarget(
                          savedPlace
                        )
                      }
                    >
                      {savedPlace.status ===
                        "가고싶어" &&
                        "♡ 가고싶어"}

                      {savedPlace.status ===
                        "다녀왔어" &&
                        "✓ 다녀왔어"}

                      {savedPlace.status ===
                        "최애" &&
                        "★ 최애"}

                      <span className="status-arrow">
                        ›
                      </span>
                    </button>
                  </div>

                  <h3>
                    {savedPlace.name}
                  </h3>

                  {savedPlace.area && (
                    <p className="place-area">
                      📍{" "}
                      {savedPlace.area}
                    </p>
                  )}

                  {savedPlace.memo && (
                    <p className="place-card-memo">
                      {
                        savedPlace.memo
                      }
                    </p>
                  )}

                  <div className="place-actions">
                    <button
                      className="place-meeting-button"
                      onClick={() =>
                        makeMeetingFromPlace(
                          savedPlace
                        )
                      }
                    >
                      약속 잡기
                    </button>

                    <button
                      className="place-more-delete"
                      onClick={() =>
                        deletePlace(
                          savedPlace.id
                        )
                      }
                    >
                      삭제
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      )}

      {/* =====================================
          TODO
      ===================================== */}

      {activeTab === "todos" && (
        <section>
          <p className="step-label">
            TODO
          </p>

          <h2 className="section-title">
            할 일
          </h2>

          <div className="todo-create">
            <input
              type="text"
              placeholder="예: 영화 예매하기"
              value={
                todoInput
              }
              onChange={(e) =>
                setTodoInput(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  createTodo();
                }
              }}
            />

            <button
              onClick={
                createTodo
              }
              disabled={saving}
            >
              추가
            </button>
          </div>

          <label className="integration-option">
            <input
              type="checkbox"
              checked={
                addToKakaoTask
              }
              onChange={(e) =>
                setAddToKakaoTask(
                  e.target.checked
                )
              }
            />

            <span>
              카카오 내 할 일에도 추가
            </span>
          </label>

          {todos.length === 0 && (
            <div className="empty">
              아직 할 일이 없어요.
            </div>
          )}

          <div className="todo-list">
            {todos.map(
              (todo) => (
                <div
                  className={`todo-item ${
                    todo.completed
                      ? "todo-completed"
                      : ""
                  }`}
                  key={
                    todo.id
                  }
                >
                  <button
                    className="todo-check"
                    onClick={() =>
                      toggleTodo(
                        todo
                      )
                    }
                  >
                    {todo.completed
                      ? "✓"
                      : ""}
                  </button>

                  <span>
                    {todo.title}
                  </span>

                  {todo.kakao_task_id && (
                    <small className="todo-sync">
                      Kakao
                    </small>
                  )}

                  <button
                    className="todo-delete"
                    onClick={() =>
                      deleteTodo(
                        todo.id
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* =====================================
          STATUS SHEET
      ===================================== */}

      {statusTarget && (
        <div
          className="status-overlay"
          onClick={() =>
            setStatusTarget(null)
          }
        >
          <div
            className="status-sheet"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="sheet-handle" />

            <div className="status-sheet-header">
              <p className="step-label">
                PLACE STATUS
              </p>

              <h2>
                {statusTarget.name}
              </h2>

              <p>
                여긴 지금 어떤 곳이야?
              </p>
            </div>

            <div className="status-choice-list">
              <button
                className={`status-choice ${
                  statusTarget.status ===
                  "가고싶어"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  changePlaceStatus(
                    statusTarget.id,
                    "가고싶어"
                  )
                }
              >
                <span className="status-choice-icon">
                  ♡
                </span>

                <span className="status-choice-text">
                  <strong>
                    가고싶어
                  </strong>

                  <small>
                    다음 약속 후보로 남겨두기
                  </small>
                </span>

                <span>
                  {statusTarget.status ===
                    "가고싶어"
                    ? "✓"
                    : "›"}
                </span>
              </button>

              <button
                className={`status-choice ${
                  statusTarget.status ===
                  "다녀왔어"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  changePlaceStatus(
                    statusTarget.id,
                    "다녀왔어"
                  )
                }
              >
                <span className="status-choice-icon">
                  ✓
                </span>

                <span className="status-choice-text">
                  <strong>
                    다녀왔어
                  </strong>

                  <small>
                    방문한 장소로 기록하기
                  </small>
                </span>

                <span>
                  {statusTarget.status ===
                    "다녀왔어"
                    ? "✓"
                    : "›"}
                </span>
              </button>

              <button
                className={`status-choice favorite-choice ${
                  statusTarget.status ===
                  "최애"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  changePlaceStatus(
                    statusTarget.id,
                    "최애"
                  )
                }
              >
                <span className="status-choice-icon">
                  ★
                </span>

                <span className="status-choice-text">
                  <strong>
                    최애
                  </strong>

                  <small>
                    또 가고 싶은 베스트 장소
                  </small>
                </span>

                <span>
                  {statusTarget.status ===
                    "최애"
                    ? "✓"
                    : "›"}
                </span>
              </button>
            </div>

            <button
              className="sheet-close"
              onClick={() =>
                setStatusTarget(null)
              }
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}