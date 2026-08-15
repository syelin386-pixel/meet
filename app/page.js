"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;

  return `D+${Math.abs(days)}`;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [needsNickname, setNeedsNickname] = useState(false);

  const [activeTab, setActiveTab] = useState("meetings");
  const [step, setStep] = useState(0);

  // =========================
  // 약속
  // =========================

  const [meetings, setMeetings] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  const [addToKakaoCalendar, setAddToKakaoCalendar] =
    useState(true);

  // 어떤 PLACES에서 만든 약속인지
  const [selectedSavedPlaceId, setSelectedSavedPlaceId] =
    useState(null);

  // meetingId -> placeId 연결
  const [meetingPlaceLinks, setMeetingPlaceLinks] =
    useState({});

  // 약속 완료 후 장소 평가창
  const [placeReview, setPlaceReview] = useState(null);

  // =========================
  // PLACES
  // =========================

  const [places, setPlaces] = useState([]);

  const [placeName, setPlaceName] = useState("");
  const [placeArea, setPlaceArea] = useState("");
  const [placeMemo, setPlaceMemo] = useState("");

  const [placeCategory, setPlaceCategory] =
    useState("맛집");

  const [placeStatus, setPlaceStatus] =
    useState("가고싶어");

  const [placeFilter, setPlaceFilter] =
    useState("ALL");

  // =========================
  // TODO
  // =========================

  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");

  const [addToKakaoTask, setAddToKakaoTask] =
    useState(true);

  // =========================
  // 시작
  // =========================

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      const response = await fetch("/api/kakao/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!data.loggedIn || !data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = data.user;

      setUser(currentUser);

      // 닉네임
      const savedNickname = localStorage.getItem(
        `meet_nickname_${currentUser.id}`
      );

      if (savedNickname) {
        setNickname(savedNickname);
        setNicknameInput(savedNickname);
        setNeedsNickname(false);
      } else {
        setNeedsNickname(true);
      }

      // TODO
      const savedTodos = localStorage.getItem(
        `meet_todos_${currentUser.id}`
      );

      if (savedTodos) {
        try {
          setTodos(JSON.parse(savedTodos));
        } catch {
          setTodos([]);
        }
      }

      // PLACES
      const savedPlaces = localStorage.getItem(
        `meet_places_${currentUser.id}`
      );

      if (savedPlaces) {
        try {
          setPlaces(JSON.parse(savedPlaces));
        } catch {
          setPlaces([]);
        }
      }

      // 약속 ↔ 장소 연결정보
      const savedLinks = localStorage.getItem(
        `meet_meeting_place_links_${currentUser.id}`
      );

      if (savedLinks) {
        try {
          setMeetingPlaceLinks(JSON.parse(savedLinks));
        } catch {
          setMeetingPlaceLinks({});
        }
      }

      await loadMeetings();

      setLoading(false);
    } catch (error) {
      console.error("Initialize error:", error);

      setUser(null);
      setLoading(false);
    }
  }

  // =========================
  // 로그인
  // =========================

  function loginWithKakao() {
    window.location.href = "/api/kakao/login";
  }

  async function logout() {
    try {
      await fetch("/api/kakao/logout", {
        method: "POST",
      });

      setUser(null);
      setNickname("");
      setNicknameInput("");
      setMeetings([]);
      setPlaces([]);
      setTodos([]);
      setMeetingPlaceLinks({});
      setPlaceReview(null);
      setStep(0);

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("로그아웃에 실패했어요.");
    }
  }

  // =========================
  // 닉네임
  // =========================

  function saveNickname() {
    const cleanNickname = nicknameInput.trim();

    if (!cleanNickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    localStorage.setItem(
      `meet_nickname_${user.id}`,
      cleanNickname
    );

    setNickname(cleanNickname);
    setNeedsNickname(false);
  }

  // =========================
  // 약속
  // =========================

  async function loadMeetings() {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      return;
    }

    setMeetings(
      (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        date: item.meeting_date,
        startTime: item.start_time,
        endTime: item.end_time,
        plan: item.plan,
        place: item.place,
        completed: item.completed,
      }))
    );
  }

  async function addMeetingToKakaoCalendar() {
    const response = await fetch("/api/kakao/calendar", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        title: title.trim(),
        date,
        startTime,
        endTime,
        plan: plan.trim(),
        place: place.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "톡캘린더 추가 실패"
      );
    }
  }

  function saveMeetingPlaceLinks(nextLinks) {
    if (!user) return;

    setMeetingPlaceLinks(nextLinks);

    localStorage.setItem(
      `meet_meeting_place_links_${user.id}`,
      JSON.stringify(nextLinks)
    );
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

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: title.trim(),
        meeting_date: date,
        start_time: startTime,
        end_time: endTime || null,
        plan: plan.trim() || null,
        place: place.trim() || null,
        completed: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      alert("약속 저장에 실패했어요.");
      return;
    }

    // PLACES의 장소로 만든 약속이면 연결 기억
    if (selectedSavedPlaceId && data?.id) {
      const nextLinks = {
        ...meetingPlaceLinks,
        [data.id]: selectedSavedPlaceId,
      };

      saveMeetingPlaceLinks(nextLinks);
    }

    let calendarSuccess = false;

    if (addToKakaoCalendar) {
      try {
        await addMeetingToKakaoCalendar();
        calendarSuccess = true;
      } catch (error) {
        console.error(error);
      }
    }

    await loadMeetings();

    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlan("");
    setPlace("");

    setSelectedSavedPlaceId(null);
    setAddToKakaoCalendar(true);

    setStep(0);
    setActiveTab("meetings");

    if (addToKakaoCalendar) {
      if (calendarSuccess) {
        alert(
          "약속을 만들었어요!\n톡캘린더에도 추가했어요 🟡"
        );
      } else {
        alert(
          "MEET에는 저장됐지만 톡캘린더 추가는 실패했어요."
        );
      }
    }
  }

  async function deleteMeeting(id) {
    const ok = window.confirm(
      "이 약속을 삭제할까요?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", id);

    if (error) {
      alert("약속 삭제에 실패했어요.");
      return;
    }

    // 장소 연결정보도 삭제
    if (meetingPlaceLinks[id]) {
      const nextLinks = {
        ...meetingPlaceLinks,
      };

      delete nextLinks[id];

      saveMeetingPlaceLinks(nextLinks);
    }

    await loadMeetings();
  }

  async function toggleMeetingComplete(meeting) {
    const willComplete = !meeting.completed;

    const { error } = await supabase
      .from("meetings")
      .update({
        completed: willComplete,
      })
      .eq("id", meeting.id);

    if (error) {
      alert("완료 상태 변경에 실패했어요.");
      return;
    }

    await loadMeetings();

    // 이제 막 완료한 약속이 PLACES에서 만들어진 경우
    if (willComplete) {
      const linkedPlaceId =
        meetingPlaceLinks[meeting.id];

      if (linkedPlaceId) {
        const linkedPlace = places.find(
          (item) =>
            String(item.id) ===
            String(linkedPlaceId)
        );

        if (
          linkedPlace &&
          linkedPlace.status === "가고싶어"
        ) {
          setPlaceReview({
            meetingId: meeting.id,
            placeId: linkedPlace.id,
            placeName: linkedPlace.name,
          });
        }
      }
    }
  }

  // =========================
  // PLACES
  // =========================

  function savePlaces(nextPlaces) {
    setPlaces(nextPlaces);

    localStorage.setItem(
      `meet_places_${user.id}`,
      JSON.stringify(nextPlaces)
    );
  }

  function createPlace() {
    const cleanName = placeName.trim();

    if (!cleanName) {
      alert("장소 이름을 입력해주세요.");
      return;
    }

    const newPlace = {
      id: Date.now(),
      name: cleanName,
      area: placeArea.trim(),
      memo: placeMemo.trim(),
      category: placeCategory,
      status: placeStatus,
      createdAt: new Date().toISOString(),
    };

    savePlaces([
      newPlace,
      ...places,
    ]);

    setPlaceName("");
    setPlaceArea("");
    setPlaceMemo("");
    setPlaceCategory("맛집");
    setPlaceStatus("가고싶어");
  }

  function deletePlace(id) {
    const ok = window.confirm(
      "이 장소를 삭제할까요?"
    );

    if (!ok) return;

    savePlaces(
      places.filter(
        (item) => item.id !== id
      )
    );
  }

  // 장소 상태 변경
  function changePlaceStatus(id, status) {
    const nextPlaces = places.map(
      (item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
    );

    savePlaces(nextPlaces);
  }

  // 약속 완료 후 평가
  function finishPlaceReview(status) {
    if (!placeReview) return;

    changePlaceStatus(
      placeReview.placeId,
      status
    );

    setPlaceReview(null);
  }

  // PLACES → 약속
  function makeMeetingFromPlace(savedPlace) {
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");

    setPlace(savedPlace.name);
    setPlan(savedPlace.memo || "");

    setSelectedSavedPlaceId(savedPlace.id);

    setActiveTab("meetings");
    setStep(1);
  }

  // =========================
  // TODO
  // =========================

  function saveTodos(nextTodos) {
    setTodos(nextTodos);

    localStorage.setItem(
      `meet_todos_${user.id}`,
      JSON.stringify(nextTodos)
    );
  }

  async function addTodoToKakao(content) {
    const response = await fetch(
      "/api/kakao/task",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          content,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          "카카오 할 일 추가 실패"
      );
    }
  }

  async function createTodo() {
    const cleanTodo =
      todoInput.trim();

    if (!cleanTodo) return;

    const newTodo = {
      id: Date.now(),
      title: cleanTodo,
      completed: false,
    };

    saveTodos([
      newTodo,
      ...todos,
    ]);

    setTodoInput("");

    if (addToKakaoTask) {
      try {
        await addTodoToKakao(
          cleanTodo
        );

        alert(
          "카카오 내 할 일에도 추가했어요 🟡"
        );
      } catch {
        alert(
          "MEET에는 저장됐지만 카카오 내 할 일 추가는 실패했어요."
        );
      }
    }
  }

  function toggleTodo(todo) {
    saveTodos(
      todos.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              completed:
                !item.completed,
            }
          : item
      )
    );
  }

  function deleteTodo(id) {
    saveTodos(
      todos.filter(
        (item) =>
          item.id !== id
      )
    );
  }

  // =========================
  // LOADING / LOGIN
  // =========================

  if (loading) {
    return (
      <main className="center-page">
        <h1>MEET</h1>
        <p>불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-logo">
          <h1>MEET</h1>
          <p>어디서 머할까?</p>
        </div>

        <div className="login-box">
          <h2>
            같이 약속을 만들어봐요.
          </h2>

          <button
            className="kakao-button"
            onClick={loginWithKakao}
          >
            카카오로 시작하기
          </button>
        </div>
      </main>
    );
  }

  if (needsNickname) {
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
          value={nicknameInput}
          onChange={(e) =>
            setNicknameInput(
              e.target.value
            )
          }
        />

        <button onClick={saveNickname}>
          MEET 시작하기
        </button>
      </main>
    );
  }

  // =========================
  // 약속 생성
  // =========================

  if (step !== 0) {
    return (
      <main>
        {step === 1 && (
          <section className="create-page">
            <p className="step-label">
              01 / NAME
            </p>

            <h2>약속 이름</h2>

            <input
              type="text"
              placeholder="예: 공방 가기"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
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
                setSelectedSavedPlaceId(
                  null
                );

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

            <h2>언제 만날까?</h2>

            <label>날짜</label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
            />

            <label>시작 시간</label>

            <input
              type="time"
              value={startTime}
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
            />

            <label>끝나는 시간</label>

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

            <h2>뭐 할까?</h2>

            <textarea
              placeholder="예: 도자기 만들기"
              value={plan}
              onChange={(e) =>
                setPlan(e.target.value)
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
              placeholder="예: 성수 도자기 공방"
              value={place}
              onChange={(e) =>
                setPlace(e.target.value)
              }
            />

            {selectedSavedPlaceId && (
              <div className="linked-place-notice">
                ♡ PLACES에서 가져온 장소예요
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

              <h3>{title}</h3>

              <p>📅 {date}</p>

              <p>
                ⏰ {startTime}
                {endTime &&
                  ` ~ ${endTime}`}
              </p>

              {plan && (
                <p>✦ {plan}</p>
              )}

              {place && (
                <p>📍 {place}</p>
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
              onClick={createMeeting}
            >
              약속 만들기
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

  // =========================
  // HOME
  // =========================

  return (
    <main>
      <header className="home-header">
        <div>
          <h1>MEET</h1>
          <p>어디서 머할까?</p>
        </div>

        <div className="user-area">
          <span>{nickname}</span>

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
            setActiveTab("meetings")
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
            setActiveTab("places")
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
            setActiveTab("todos")
          }
        >
          TODO
        </button>
      </nav>

      {/* =========================
          약속
      ========================= */}

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
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className={`meeting-card ${
                  meeting.completed
                    ? "completed"
                    : ""
                }`}
              >
                <div className="dday">
                  {getDday(meeting.date)}
                </div>

                <div className="meeting-top">
                  <button
                    className="check-button"
                    onClick={() =>
                      toggleMeetingComplete(
                        meeting
                      )
                    }
                  >
                    {meeting.completed
                      ? "✓"
                      : ""}
                  </button>

                  <h2>
                    {meeting.title}
                  </h2>
                </div>

                <div className="meeting-info">
                  <p>
                    📅 {meeting.date}
                  </p>

                  <p>
                    ⏰ {meeting.startTime}
                    {meeting.endTime &&
                      ` ~ ${meeting.endTime}`}
                  </p>

                  {meeting.plan && (
                    <p>
                      ✦ {meeting.plan}
                    </p>
                  )}

                  {meeting.place && (
                    <p>
                      📍 {meeting.place}
                    </p>
                  )}
                </div>

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
            ))}
          </section>

          <button
            className="new-button"
            onClick={() => {
              setSelectedSavedPlaceId(
                null
              );

              setTitle("");
              setDate("");
              setStartTime("");
              setEndTime("");
              setPlan("");
              setPlace("");

              setStep(1);
            }}
          >
            + 새 약속 만들기
          </button>
        </>
      )}

      {/* =========================
          PLACES
      ========================= */}

      {activeTab === "places" && (
        <section>
          <p className="step-label">
            PLACES
          </p>

          <h2 className="section-title">
            우리 어디 가지?
          </h2>

          <p className="places-description">
            맛집부터 최애 공방까지,
            같이 가고 싶은 곳을 모아둬.
          </p>

          <div className="place-create">
            <h3 className="place-form-title">
              + 새 장소 저장
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
              ].map((category) => (
                <button
                  key={category}
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
              ))}
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
              placeholder="메모 · 예: 크림파스타 먹어보기"
              value={placeMemo}
              onChange={(e) =>
                setPlaceMemo(
                  e.target.value
                )
              }
            />

            <button
              className="save-place-button"
              onClick={createPlace}
            >
              + 장소 저장
            </button>
          </div>

          <div className="place-filters">
            {[
              "ALL",
              "맛집",
              "카페",
              "공방",
              "놀거리",
              "최애",
            ].map((filter) => (
              <button
                key={filter}
                className={
                  placeFilter === filter
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
            ))}
          </div>

          <div className="place-list">
            {places
              .filter((savedPlace) => {
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

                return (
                  savedPlace.category ===
                  placeFilter
                );
              })
              .map((savedPlace) => (
                <div
                  className="place-card"
                  key={savedPlace.id}
                >
                  <div className="place-card-top">
                    <span className="place-category">
                      {savedPlace.category}
                    </span>

                    <span
                      className={`place-status ${
                        savedPlace.status ===
                        "최애"
                          ? "favorite"
                          : ""
                      }`}
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
                    </span>
                  </div>

                  <h3>
                    {savedPlace.name}
                  </h3>

                  {savedPlace.area && (
                    <p className="place-area">
                      📍 {savedPlace.area}
                    </p>
                  )}

                  {savedPlace.memo && (
                    <p className="place-card-memo">
                      “{savedPlace.memo}”
                    </p>
                  )}

                  {/* 상태 직접 변경 */}

                  <div className="place-status-change">
                    <button
                      className={
                        savedPlace.status ===
                        "가고싶어"
                          ? "mini-status active"
                          : "mini-status"
                      }
                      onClick={() =>
                        changePlaceStatus(
                          savedPlace.id,
                          "가고싶어"
                        )
                      }
                    >
                      ♡ 가고싶어
                    </button>

                    <button
                      className={
                        savedPlace.status ===
                        "다녀왔어"
                          ? "mini-status active"
                          : "mini-status"
                      }
                      onClick={() =>
                        changePlaceStatus(
                          savedPlace.id,
                          "다녀왔어"
                        )
                      }
                    >
                      ✓ 다녀왔어
                    </button>

                    <button
                      className={
                        savedPlace.status ===
                        "최애"
                          ? "mini-status active"
                          : "mini-status"
                      }
                      onClick={() =>
                        changePlaceStatus(
                          savedPlace.id,
                          "최애"
                        )
                      }
                    >
                      ★ 최애
                    </button>
                  </div>

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
                      className="delete-button"
                      onClick={() =>
                        deletePlace(
                          savedPlace.id
                        )
                      }
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* =========================
          TODO
      ========================= */}

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
              value={todoInput}
              onChange={(e) =>
                setTodoInput(
                  e.target.value
                )
              }
            />

            <button
              onClick={createTodo}
            >
              추가
            </button>
          </div>

          <label className="integration-option">
            <input
              type="checkbox"
              checked={addToKakaoTask}
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

          <div className="todo-list">
            {todos.map((todo) => (
              <div
                className={`todo-item ${
                  todo.completed
                    ? "todo-completed"
                    : ""
                }`}
                key={todo.id}
              >
                <button
                  className="todo-check"
                  onClick={() =>
                    toggleTodo(todo)
                  }
                >
                  {todo.completed
                    ? "✓"
                    : ""}
                </button>

                <span>
                  {todo.title}
                </span>

                <button
                  className="todo-delete"
                  onClick={() =>
                    deleteTodo(todo.id)
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================
          다녀온 장소 평가 팝업
      ========================= */}

      {placeReview && (
        <div className="review-overlay">
          <div className="review-modal">
            <p className="step-label">
              HOW WAS IT?
            </p>

            <h2>
              {placeReview.placeName}
            </h2>

            <p className="review-description">
              다녀왔네! 여긴 어땠어?
            </p>

            <button
              className="visited-button"
              onClick={() =>
                finishPlaceReview(
                  "다녀왔어"
                )
              }
            >
              ✓ 다녀왔어
            </button>

            <button
              className="favorite-button"
              onClick={() =>
                finishPlaceReview(
                  "최애"
                )
              }
            >
              ★ 최애야
            </button>

            <button
              className="later-button"
              onClick={() =>
                setPlaceReview(null)
              }
            >
              나중에 정할래
            </button>
          </div>
        </div>
      )}
    </main>
  );
}