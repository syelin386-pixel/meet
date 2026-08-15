"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);

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

  // 약속
  const [meetings, setMeetings] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  // TODO
  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
      }

      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = session.user;

      setUser(currentUser);

      await loadProfile(currentUser.id);
      await loadMeetings();
      await loadTodos(currentUser.id);

      if (mounted) {
        setLoading(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setNickname("");
        setNicknameInput("");
        setMeetings([]);
        setTodos([]);
        setNeedsNickname(false);
        setActiveTab("meetings");
        setStep(0);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const currentUser = session.user;

        setUser(currentUser);

        setTimeout(async () => {
          await loadProfile(currentUser.id);
          await loadMeetings();
          await loadTodos(currentUser.id);

          setLoading(false);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // 카카오 로그인
  // =========================

  async function loginWithKakao() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Kakao login error:", error);
      alert("카카오 로그인에 실패했어요.");
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      alert("로그아웃에 실패했어요.");
      return;
    }

    setUser(null);
    setNickname("");
    setNicknameInput("");
    setMeetings([]);
    setTodos([]);
    setNeedsNickname(false);
    setActiveTab("meetings");
    setStep(0);
  }

  // =========================
  // 닉네임
  // =========================

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);
      return;
    }

    if (!data) {
      setNeedsNickname(true);
      setNickname("");
      setNicknameInput("");
      return;
    }

    setNickname(data.nickname);
    setNicknameInput(data.nickname);
    setNeedsNickname(false);
  }

  async function saveNickname() {
    const cleanNickname = nicknameInput.trim();

    if (!cleanNickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!user) {
      alert("로그인 정보가 없어요.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        nickname: cleanNickname,
      });

    if (error) {
      console.error("Nickname save error:", error);
      alert("닉네임 저장에 실패했어요.");
      return;
    }

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
      console.error("Meetings load error:", error);
      return;
    }

    const formatted = (data || []).map((item) => ({
      id: item.id,
      title: item.title,
      date: item.meeting_date,
      startTime: item.start_time,
      endTime: item.end_time,
      plan: item.plan,
      place: item.place,
      completed: item.completed,
    }));

    setMeetings(formatted);
  }

  async function createMeeting() {
    if (!title.trim()) {
      alert("약속 이름을 입력해주세요.");
      return;
    }

    const { error } = await supabase
      .from("meetings")
      .insert({
        title: title.trim(),
        meeting_date: date || null,
        start_time: startTime || null,
        end_time: endTime || null,
        plan: plan.trim() || null,
        place: place.trim() || null,
        completed: false,
      });

    if (error) {
      console.error("Meeting create error:", error);
      alert("약속 저장에 실패했어요.");
      return;
    }

    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlan("");
    setPlace("");

    await loadMeetings();

    setStep(0);
    setActiveTab("meetings");
  }

  async function deleteMeeting(id) {
    const ok = window.confirm("이 약속을 삭제할까요?");

    if (!ok) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Meeting delete error:", error);
      alert("약속 삭제에 실패했어요.");
      return;
    }

    await loadMeetings();
  }

  async function toggleMeetingComplete(meeting) {
    const { error } = await supabase
      .from("meetings")
      .update({
        completed: !meeting.completed,
      })
      .eq("id", meeting.id);

    if (error) {
      console.error("Meeting update error:", error);
      alert("완료 상태 변경에 실패했어요.");
      return;
    }

    await loadMeetings();
  }

  // =========================
  // TODO
  // =========================

  async function loadTodos(userId) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Todos load error:", error);
      return;
    }

    setTodos(data || []);
  }

  async function createTodo() {
    const cleanTodo = todoInput.trim();

    if (!cleanTodo) {
      return;
    }

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        title: cleanTodo,
        completed: false,
      });

    if (error) {
      console.error("Todo create error:", error);
      alert("할 일 저장에 실패했어요.");
      return;
    }

    setTodoInput("");

    await loadTodos(user.id);
  }

  async function toggleTodo(todo) {
    if (!user) return;

    const { error } = await supabase
      .from("todos")
      .update({
        completed: !todo.completed,
      })
      .eq("id", todo.id);

    if (error) {
      console.error("Todo update error:", error);
      alert("할 일 변경에 실패했어요.");
      return;
    }

    await loadTodos(user.id);
  }

  async function deleteTodo(id) {
    if (!user) return;

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Todo delete error:", error);
      alert("할 일 삭제에 실패했어요.");
      return;
    }

    await loadTodos(user.id);
  }

  // =========================
  // 로딩
  // =========================

  if (loading) {
    return (
      <main className="center-page">
        <h1>MEET</h1>
        <p>불러오는 중...</p>
      </main>
    );
  }

  // =========================
  // 로그인
  // =========================

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-logo">
          <h1>MEET</h1>
          <p>어디서 머할까?</p>
        </div>

        <div className="login-box">
          <h2>같이 약속을 만들어봐요.</h2>

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

  // =========================
  // 첫 로그인 닉네임 설정
  // =========================

  if (needsNickname) {
    return (
      <main className="nickname-page">
        <p className="step-label">
          WELCOME TO MEET
        </p>

        <h2>뭐라고 부르면 될까?</h2>

        <p className="nickname-description">
          MEET에서 사용할 닉네임을 정해주세요.
        </p>

        <input
          type="text"
          placeholder="닉네임"
          maxLength={12}
          value={nicknameInput}
          onChange={(e) =>
            setNicknameInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveNickname();
            }
          }}
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
              placeholder="예: 영화 보러 가기"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />

            <button onClick={() => setStep(2)}>
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() => setStep(0)}
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
                setStartTime(e.target.value)
              }
            />

            <label>끝나는 시간</label>

            <input
              type="time"
              value={endTime}
              onChange={(e) =>
                setEndTime(e.target.value)
              }
            />

            <button onClick={() => setStep(3)}>
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() => setStep(1)}
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
              placeholder="예: 영화 보고 저녁 먹기"
              value={plan}
              onChange={(e) =>
                setPlan(e.target.value)
              }
            />

            <button onClick={() => setStep(4)}>
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() => setStep(2)}
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

            <h2>어디서 만날까?</h2>

            <input
              type="text"
              placeholder="예: 성수역"
              value={place}
              onChange={(e) =>
                setPlace(e.target.value)
              }
            />

            <button onClick={() => setStep(5)}>
              다음 →
            </button>

            <button
              className="back-button"
              onClick={() => setStep(3)}
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

            <h2>이렇게 만날까?</h2>

            <div className="confirm-card">
              <div className="confirm-dday">
                {getDday(date)}
              </div>

              <h3>
                {title || "약속 이름 없음"}
              </h3>

              <p>
                📅 {date || "날짜 미정"}
              </p>

              <p>
                ⏰ {startTime || "시간 미정"}
                {endTime && ` ~ ${endTime}`}
              </p>

              {plan && (
                <p>✦ {plan}</p>
              )}

              {place && (
                <p>📍 {place}</p>
              )}
            </div>

            <button onClick={createMeeting}>
              약속 만들기
            </button>

            <button
              className="back-button"
              onClick={() => setStep(4)}
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

      {/* 메뉴 */}

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

          {meetings.length > 0 && (
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
                        toggleMeetingComplete(meeting)
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
                      📅{" "}
                      {meeting.date ||
                        "날짜 미정"}
                    </p>

                    <p>
                      ⏰{" "}
                      {meeting.startTime ||
                        "시간 미정"}

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
                      deleteMeeting(meeting.id)
                    }
                  >
                    삭제
                  </button>
                </div>
              ))}
            </section>
          )}

          <button
            className="new-button"
            onClick={() => setStep(1)}
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
            어디 갈까?
          </h2>

          <div className="empty">
            아직 저장한 장소가 없어요.
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
                setTodoInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createTodo();
                }
              }}
            />

            <button onClick={createTodo}>
              추가
            </button>
          </div>

          {todos.length === 0 && (
            <div className="empty">
              아직 할 일이 없어요.
            </div>
          )}

          <div className="todo-list">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`todo-item ${
                  todo.completed
                    ? "todo-completed"
                    : ""
                }`}
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
    </main>
  );
}