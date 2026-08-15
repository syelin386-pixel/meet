"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(dateString + "T00:00:00");

  today.setHours(0, 0, 0, 0);

  const difference = target.getTime() - today.getTime();

  const days = Math.round(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;

  return `D+${Math.abs(days)}`;
}

export default function Home() {
  const [loading, setLoading] = useState(true);

  // 로그인 사용자
  const [user, setUser] = useState(null);

  // 닉네임
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [needsNickname, setNeedsNickname] = useState(false);

  // 화면
  const [step, setStep] = useState(0);

  // 약속
  const [meetings, setMeetings] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  useEffect(() => {
    checkLogin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;

        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
          await loadMeetings();
        } else {
          setNickname("");
          setMeetings([]);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkLogin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (user) {
      await loadProfile(user.id);
      await loadMeetings();
    }

    setLoading(false);
  }

  async function loginWithKakao() {
    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "kakao",

        options: {
          redirectTo: window.location.origin,
        },
      });

    if (error) {
      console.error(error);
      alert("카카오 로그인에 실패했어요.");
    }
  }

  async function logout() {
    await supabase.auth.signOut({
      scope: "local",
    });

    setUser(null);
    setNickname("");
    setMeetings([]);
    setStep(0);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (!data) {
      setNeedsNickname(true);
      setNickname("");
    } else {
      setNickname(data.nickname);
      setNicknameInput(data.nickname);
      setNeedsNickname(false);
    }
  }

  async function saveNickname() {
    if (!nicknameInput.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        nickname: nicknameInput.trim(),
      });

    if (error) {
      console.error(error);
      alert("닉네임 저장에 실패했어요.");
      return;
    }

    setNickname(nicknameInput.trim());
    setNeedsNickname(false);
  }

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
        title: title,
        meeting_date: date || null,
        start_time: startTime || null,
        end_time: endTime || null,
        plan: plan || null,
        place: place || null,
        completed: false,
      });

    if (error) {
      console.error(error);
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
  }

  async function deleteMeeting(id) {
    const ok =
      window.confirm("이 약속을 삭제할까요?");

    if (!ok) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("삭제에 실패했어요.");
      return;
    }

    await loadMeetings();
  }

  async function toggleComplete(meeting) {
    const { error } = await supabase
      .from("meetings")
      .update({
        completed: !meeting.completed,
      })
      .eq("id", meeting.id);

    if (error) {
      console.error(error);
      alert("완료 상태 변경에 실패했어요.");
      return;
    }

    await loadMeetings();
  }

  if (loading) {
    return (
      <main className="center-page">
        <h1>MEET</h1>

        <p>불러오는 중...</p>
      </main>
    );
  }

  // 로그인 전
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

          <p>
            카카오 계정으로 간편하게 시작할 수 있어요.
          </p>

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

  // 첫 로그인 후 닉네임
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
            setNicknameInput(e.target.value)
          }
        />

        <button onClick={saveNickname}>
          MEET 시작하기
        </button>

      </main>
    );
  }

  return (
    <main>

      {/* HOME */}

      {step === 0 && (
        <>
          <header className="home-header">

            <div>
              <h1>MEET</h1>

              <p>
                어디서 머할까?
              </p>
            </div>

            <div className="user-area">

              <span>
                {nickname}
              </span>

              <button
                className="logout-button"
                onClick={logout}
              >
                로그아웃
              </button>

            </div>

          </header>

          <p className="hello">
            안녕, {nickname} 👋
          </p>

          {meetings.length === 0 && (
            <div className="empty">
              아직 약속이 없어요.
            </div>
          )}

          {meetings.length > 0 && (
            <section className="meeting-list">

              <p className="step-label">
                UPCOMING
              </p>

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
                        toggleComplete(meeting)
                      }
                    >
                      {meeting.completed
                        ? "✓"
                        : ""}
                    </button>

                    <h2>
                      {meeting.title ||
                        "이름 없는 약속"}
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
          )}

          <button
            className="new-button"
            onClick={() =>
              setStep(1)
            }
          >
            + 새 약속 만들기
          </button>
        </>
      )}

      {/* 약속 이름 */}

      {step === 1 && (
        <section className="create-page">

          <p className="step-label">
            01 / NAME
          </p>

          <h2>
            약속 이름
          </h2>

          <input
            type="text"
            placeholder="예: 영화 보러 가기"
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
            onClick={() =>
              setStep(0)
            }
          >
            ← 돌아가기
          </button>

        </section>
      )}

      {/* 날짜 시간 */}

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
              setDate(e.target.value)
            }
          />

          <label>
            시작 시간
          </label>

          <input
            type="time"
            value={startTime}
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

      {/* 할 일 */}

      {step === 3 && (
        <section className="create-page">

          <p className="step-label">
            03 / PLAN
          </p>

          <h2>
            뭐 할까?
          </h2>

          <textarea
            placeholder="예: 영화 보고 저녁 먹기"
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

      {/* 장소 */}

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
            placeholder="예: 성수역"
            value={place}
            onChange={(e) =>
              setPlace(e.target.value)
            }
          />

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

      {/* 확인 */}

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
              {title ||
                "약속 이름 없음"}
            </h3>

            <p>
              📅{" "}
              {date ||
                "날짜 미정"}
            </p>

            <p>
              ⏰{" "}
              {startTime ||
                "시간 미정"}

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
