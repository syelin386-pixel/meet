"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const days = Math.round(
    (target.getTime() - today.getTime()) / 86400000
  );

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

  /* =========================
     AUTH
  ========================= */

  const [authMode, setAuthMode] = useState("login");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNickname, setSignupNickname] = useState("");

  /* =========================
     GROUPS
  ========================= */

  const [groups, setGroups] = useState([]);

  // personal = 내 공간
  // UUID = 그룹 공간
  const [spaceId, setSpaceId] = useState("personal");

  const [groupModal, setGroupModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState("create");

  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  /* =========================
     NAV
  ========================= */

  const [activeTab, setActiveTab] = useState("meetings");
  const [step, setStep] = useState(0);

  /* =========================
     DATA
  ========================= */

  const [meetings, setMeetings] = useState([]);
  const [places, setPlaces] = useState([]);
  const [todos, setTodos] = useState([]);

  /* =========================
     MEETING
  ========================= */

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  const [addToAppleCalendar, setAddToAppleCalendar] =
    useState(true);

  const [selectedSavedPlace, setSelectedSavedPlace] =
    useState(null);

  /* =========================
     PLACES
  ========================= */

  const [placeName, setPlaceName] = useState("");
  const [placeArea, setPlaceArea] = useState("");
  const [placeMemo, setPlaceMemo] = useState("");
  const [placeCategory, setPlaceCategory] = useState("맛집");

  const [placeFilter, setPlaceFilter] = useState("ALL");

  const [statusTarget, setStatusTarget] = useState(null);

  /* =========================
     TODO
  ========================= */

  const [todoInput, setTodoInput] = useState("");

  /* =========================
     CURRENT GROUP
  ========================= */

  const currentGroup = useMemo(() => {
    if (spaceId === "personal") return null;

    return groups.find((group) => group.id === spaceId) || null;
  }, [groups, spaceId]);

  /* =========================
     INIT
  ========================= */

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!result.loggedIn || !result.user) {
        setUser(null);
        return;
      }

      setUser(result.user);

      await loadGroups();
      await loadData("personal");
    } catch (error) {
      console.error(error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     GROUP LOAD
  ========================= */

  async function loadGroups() {
    const response = await fetch("/api/groups", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "그룹을 불러오지 못했어요.");
    }

    setGroups(result.groups || []);

    return result.groups || [];
  }

  /* =========================
     DATA LOAD
  ========================= */

  async function loadData(targetSpace = spaceId) {
    const groupId =
      targetSpace === "personal" ? "personal" : targetSpace;

    const response = await fetch(
      `/api/data?groupId=${encodeURIComponent(groupId)}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "데이터를 불러오지 못했어요.");
    }

    setUser(data.user);

    setMeetings(
      (data.meetings || []).map((item) => ({
        id: item.id,
        title: item.title,
        date: item.meeting_date,
        startTime: formatTime(item.start_time),
        endTime: formatTime(item.end_time),
        plan: item.plan,
        place: item.place,
        completed: item.completed,
      }))
    );

    setPlaces(data.places || []);
    setTodos(data.todos || []);
  }

  async function changeSpace(nextSpace) {
    try {
      setLoading(true);

      setSpaceId(nextSpace);
      setActiveTab("meetings");
      setStep(0);

      await loadData(nextSpace);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function apiPost(payload) {
    const response = await fetch("/api/data", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        ...payload,

        groupId:
          spaceId === "personal"
            ? null
            : spaceId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "오류가 발생했어요.");
    }

    return result;
  }

  /* =========================
     AUTH
  ========================= */

  async function login() {
    if (!loginUsername.trim() || !loginPassword) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setUser(result.user);
      setLoginPassword("");

      setSpaceId("personal");

      await loadGroups();
      await loadData("personal");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function signup() {
    if (
      !signupUsername.trim() ||
      !signupPassword ||
      !signupNickname.trim()
    ) {
      alert("아이디, 비밀번호, 닉네임을 모두 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/auth/signup", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username: signupUsername,
          password: signupPassword,
          nickname: signupNickname,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setUser(result.user);
      setSpaceId("personal");

      await loadGroups();
      await loadData("personal");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setGroups([]);

      setMeetings([]);
      setPlaces([]);
      setTodos([]);

      setSpaceId("personal");
      setStep(0);
      setActiveTab("meetings");

      setLoginPassword("");
    } catch {
      alert("로그아웃에 실패했어요.");
    }
  }

  /* =========================
     GROUP CREATE
  ========================= */

  async function createGroup() {
    const name = newGroupName.trim();

    if (!name) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/groups", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "createGroup",
          name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      const updatedGroups = await loadGroups();

      setNewGroupName("");
      setGroupModal(false);

      const created =
        updatedGroups.find(
          (group) => group.id === result.group.id
        ) || result.group;

      setSpaceId(created.id);

      await loadData(created.id);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     GROUP JOIN
  ========================= */

  async function joinGroup() {
    const inviteCode = inviteCodeInput
      .trim()
      .toUpperCase();

    if (!inviteCode) {
      alert("초대코드를 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/groups", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "joinGroup",
          inviteCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      const updatedGroups = await loadGroups();

      setInviteCodeInput("");
      setGroupModal(false);

      const joined =
        updatedGroups.find(
          (group) => group.id === result.group.id
        ) || result.group;

      setSpaceId(joined.id);

      await loadData(joined.id);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteCode() {
    if (!currentGroup?.invite_code) return;

    try {
      await navigator.clipboard.writeText(
        currentGroup.invite_code
      );

      alert("초대코드를 복사했어요.");
    } catch {
      alert(`초대코드: ${currentGroup.invite_code}`);
    }
  }

  /* =========================
     MEETING
  ========================= */

  function resetMeetingForm() {
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlan("");
    setPlace("");

    setSelectedSavedPlace(null);
    setAddToAppleCalendar(true);
  }

  async function downloadIcs(meeting) {
    const response = await fetch("/api/calendar/ics", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(meeting),
    });

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        text || "Apple 캘린더 파일을 만들지 못했어요."
      );
    }

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${meeting.title || "MEET"}.ics`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
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

    const newMeeting = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      plan: plan.trim(),
      place: place.trim(),
    };

    try {
      setSaving(true);

      await apiPost({
        action: "createMeeting",
        meeting: newMeeting,
      });

      if (addToAppleCalendar) {
        try {
          await downloadIcs(newMeeting);
        } catch (error) {
          alert(
            `약속은 저장됐지만 Apple 캘린더 추가 파일은 만들지 못했어요.\n${error.message}`
          );
        }
      }

      await loadData();

      resetMeetingForm();

      setStep(0);
      setActiveTab("meetings");
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
        completed: !meeting.completed,
      });

      await loadData();

      if (!meeting.completed && meeting.place) {
        const found = places.find(
          (item) =>
            item.name === meeting.place &&
            item.status === "가고싶어"
        );

        if (found) {
          setStatusTarget(found);
        }
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteMeeting(id) {
    if (!window.confirm("이 약속을 삭제할까요?")) return;

    try {
      await apiPost({
        action: "deleteMeeting",
        id,
      });

      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  /* =========================
     PLACE
  ========================= */

  async function createPlace() {
    if (!placeName.trim()) {
      alert("장소 이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      await apiPost({
        action: "createPlace",

        place: {
          name: placeName.trim(),
          area: placeArea.trim(),
          memo: placeMemo.trim(),
          category: placeCategory,
        },
      });

      setPlaceName("");
      setPlaceArea("");
      setPlaceMemo("");
      setPlaceCategory("맛집");

      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePlaceStatus(id, status) {
    try {
      await apiPost({
        action: "changePlaceStatus",
        id,
        status,
      });

      setStatusTarget(null);

      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deletePlace(id) {
    if (!window.confirm("이 장소를 삭제할까요?")) return;

    try {
      await apiPost({
        action: "deletePlace",
        id,
      });

      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  function makeMeetingFromPlace(savedPlace) {
    resetMeetingForm();

    setSelectedSavedPlace(savedPlace);

    setPlace(savedPlace.name);
    setPlan(savedPlace.memo || "");

    setStep(1);
  }

  const filteredPlaces = useMemo(() => {
    return places.filter((savedPlace) => {
      if (placeFilter === "ALL") return true;

      if (placeFilter === "최애") {
        return savedPlace.status === "최애";
      }

      if (placeFilter === "다녀왔어") {
        return (
          savedPlace.status === "다녀왔어" ||
          savedPlace.status === "최애"
        );
      }

      return savedPlace.category === placeFilter;
    });
  }, [places, placeFilter]);

  /* =========================
     TODO
  ========================= */

  async function createTodo() {
    const value = todoInput.trim();

    if (!value) return;

    try {
      await apiPost({
        action: "createTodo",
        title: value,
      });

      setTodoInput("");

      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function toggleTodo(todo) {
    try {
      await apiPost({
        action: "toggleTodo",
        id: todo.id,
        completed: !todo.completed,
      });

      await loadData();
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

      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main className="center-page">
        <h1>MEET</h1>
        <p>불러오는 중...</p>
      </main>
    );
  }

  /* =========================
     AUTH SCREEN
  ========================= */

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-logo">
          <h1>MEET</h1>
          <p>어디서 머할까?</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              로그인
            </button>

            <button
              className={authMode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              회원가입
            </button>
          </div>

          {authMode === "login" && (
            <>
              <h2>다시 만나</h2>

              <input
                type="text"
                placeholder="아이디"
                autoCapitalize="none"
                value={loginUsername}
                onChange={(e) =>
                  setLoginUsername(e.target.value)
                }
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") login();
                }}
              />

              <button
                className="auth-submit"
                onClick={login}
                disabled={saving}
              >
                {saving ? "로그인 중..." : "로그인"}
              </button>
            </>
          )}

          {authMode === "signup" && (
            <>
              <h2>처음 만나</h2>

              <input
                type="text"
                placeholder="아이디 · 영문/숫자 4자 이상"
                autoCapitalize="none"
                value={signupUsername}
                onChange={(e) =>
                  setSignupUsername(e.target.value)
                }
              />

              <input
                type="password"
                placeholder="비밀번호 · 8자 이상"
                value={signupPassword}
                onChange={(e) =>
                  setSignupPassword(e.target.value)
                }
              />

              <input
                type="text"
                placeholder="닉네임"
                maxLength={12}
                value={signupNickname}
                onChange={(e) =>
                  setSignupNickname(e.target.value)
                }
              />

              <button
                className="auth-submit"
                onClick={signup}
                disabled={saving}
              >
                {saving ? "만드는 중..." : "계정 만들기"}
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  /* =========================
     CREATE MEETING STEPS
  ========================= */

  if (step !== 0) {
    return (
      <main>
        <div className="create-space-label">
          {currentGroup ? (
            <>
              <span>GROUP</span>
              {currentGroup.name}
            </>
          ) : (
            <>
              <span>PERSONAL</span>
              나의 약속
            </>
          )}
        </div>

        {step === 1 && (
          <section className="create-page">
            <p className="step-label">01 / NAME</p>

            {selectedSavedPlace && (
              <div className="place-origin-chip">
                <span>{selectedSavedPlace.category}</span>
                {selectedSavedPlace.name}
              </div>
            )}

            <h2>약속 이름</h2>

            <input
              type="text"
              placeholder="예: 전시 보러 가기"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <button onClick={() => setStep(2)}>
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
            <p className="step-label">02 / WHEN</p>

            <h2>언제 만날까?</h2>

            <label>날짜</label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            <p className="step-label">03 / PLAN</p>

            <h2>뭐 할까?</h2>

            <textarea
              placeholder="예: 밥 먹고 전시 보기"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
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
            <p className="step-label">04 / PLACE</p>

            <h2>어디서 만날까?</h2>

            <input
              type="text"
              placeholder="예: 성수"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />

            {selectedSavedPlace && (
              <div className="linked-place-card">
                <span>PLACES</span>

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
            <p className="step-label">CONFIRM</p>

            <h2>이렇게 만날까?</h2>

            <div className="confirm-card">
              <div className="confirm-dday">
                {getDday(date)}
              </div>

              {currentGroup && (
                <div className="confirm-group">
                  {currentGroup.name}
                </div>
              )}

              <h3>{title}</h3>

              <p>📅 {date}</p>

              <p>
                ⏰ {startTime}
                {endTime && ` ~ ${endTime}`}
              </p>

              {plan && <p>✦ {plan}</p>}
              {place && <p>📍 {place}</p>}
            </div>

            <label className="integration-option apple-option">
              <input
                type="checkbox"
                checked={addToAppleCalendar}
                onChange={(e) =>
                  setAddToAppleCalendar(e.target.checked)
                }
              />

              <span> Apple 캘린더에 추가</span>
            </label>

            <button
              onClick={createMeeting}
              disabled={saving}
            >
              {saving ? "만드는 중..." : "약속 만들기"}
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

  /* =========================
     MAIN
  ========================= */

  return (
    <main>
      <header className="home-header">
        <div>
          <h1>MEET</h1>
          <p>어디서 머할까?</p>
        </div>

        <div className="user-area">
          <span>{user.nickname}</span>

          <button
            className="logout-button"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* =====================
          SPACE SWITCHER
      ====================== */}

      <section className="space-section">
        <div className="space-scroll">
          <button
            className={
              spaceId === "personal"
                ? "space-chip active"
                : "space-chip"
            }
            onClick={() => changeSpace("personal")}
          >
            <span className="space-avatar">나</span>
            내 공간
          </button>

          {groups.map((group) => (
            <button
              key={group.id}
              className={
                spaceId === group.id
                  ? "space-chip active"
                  : "space-chip"
              }
              onClick={() => changeSpace(group.id)}
            >
              <span className="space-avatar">
                {group.name.slice(0, 1)}
              </span>

              {group.name}
            </button>
          ))}

          <button
            className="space-add"
            onClick={() => {
              setGroupModalMode("create");
              setGroupModal(true);
            }}
          >
            +
          </button>
        </div>
      </section>

      {/* =====================
          GROUP HEADER
      ====================== */}

      {currentGroup && (
        <section className="group-header-card">
          <div className="group-title-row">
            <div>
              <p className="step-label">GROUP</p>
              <h2>{currentGroup.name}</h2>
            </div>

            <div className="member-count">
              {currentGroup.members?.length || 1}명
            </div>
          </div>

          <div className="group-members">
            {(currentGroup.members || []).map((member) => (
              <div
                className="group-member"
                key={member.id}
              >
                <span>
                  {(member.nickname || member.username || "?")
                    .slice(0, 1)}
                </span>

                <small>
                  {member.nickname || member.username}
                </small>
              </div>
            ))}
          </div>

          <div className="invite-box">
            <div>
              <small>INVITE CODE</small>
              <strong>{currentGroup.invite_code}</strong>
            </div>

            <button onClick={copyInviteCode}>
              복사
            </button>
          </div>
        </section>
      )}

      {/* =====================
          NAV
      ====================== */}

      <nav className="top-tabs">
        <button
          className={
            activeTab === "meetings"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() => setActiveTab("meetings")}
        >
          약속
        </button>

        <button
          className={
            activeTab === "places"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() => setActiveTab("places")}
        >
          PLACES
        </button>

        <button
          className={
            activeTab === "todos"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() => setActiveTab("todos")}
        >
          TODO
        </button>
      </nav>

      {/* =====================
          MEETINGS
      ====================== */}

      {activeTab === "meetings" && (
        <>
          <p className="step-label">
            {currentGroup
              ? `${currentGroup.name} / UPCOMING`
              : "MY / UPCOMING"}
          </p>

          {meetings.length === 0 && (
            <div className="empty">
              {currentGroup
                ? `${currentGroup.name}의 첫 약속을 만들어봐.`
                : "아직 약속이 없어요."}
            </div>
          )}

          <section className="meeting-list">
            {meetings.map((meeting) => (
              <article
                className={`meeting-card ${
                  meeting.completed ? "completed" : ""
                }`}
                key={meeting.id}
              >
                <div className="dday">
                  {getDday(meeting.date)}
                </div>

                <div className="meeting-top">
                  <button
                    className="check-button"
                    onClick={() =>
                      toggleMeeting(meeting)
                    }
                  >
                    {meeting.completed ? "✓" : ""}
                  </button>

                  <h2>{meeting.title}</h2>
                </div>

                <div className="meeting-info">
                  <p>📅 {meeting.date}</p>

                  <p>
                    ⏰ {meeting.startTime}
                    {meeting.endTime &&
                      ` ~ ${meeting.endTime}`}
                  </p>

                  {meeting.plan && (
                    <p>✦ {meeting.plan}</p>
                  )}

                  {meeting.place && (
                    <p>📍 {meeting.place}</p>
                  )}
                </div>

                <div className="meeting-card-actions">
                  <button
                    className="calendar-again-button"
                    onClick={() =>
                      downloadIcs(meeting)
                    }
                  >
                     캘린더
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteMeeting(meeting.id)
                    }
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </section>

          <button
            className="new-button"
            onClick={() => {
              resetMeetingForm();
              setStep(1);
            }}
          >
            +{" "}
            {currentGroup
              ? `${currentGroup.name} 약속 만들기`
              : "새 약속 만들기"}
          </button>
        </>
      )}

      {/* =====================
          PLACES
      ====================== */}

      {activeTab === "places" && (
        <section>
          <p className="step-label">
            {currentGroup
              ? `${currentGroup.name} / PLACES`
              : "MY / PLACES"}
          </p>

          <h2 className="section-title">
            우리 어디 가지?
          </h2>

          <p className="places-description">
            {currentGroup
              ? `${currentGroup.name} 멤버들이 같이 가고 싶은 곳을 모아둬.`
              : "맛집, 카페, 공방, 놀거리까지. 마음에 드는 곳을 모아둬."}
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
              ].map((category) => (
                <button
                  key={category}
                  className={
                    placeCategory === category
                      ? "category-button selected"
                      : "category-button"
                  }
                  onClick={() =>
                    setPlaceCategory(category)
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
                setPlaceName(e.target.value)
              }
            />

            <input
              type="text"
              placeholder="지역 · 예: 성수"
              value={placeArea}
              onChange={(e) =>
                setPlaceArea(e.target.value)
              }
            />

            <textarea
              placeholder="메모 · 예: 크림파스타 먹기"
              value={placeMemo}
              onChange={(e) =>
                setPlaceMemo(e.target.value)
              }
            />

            <button
              className="save-place-button"
              onClick={createPlace}
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
            ].map((filter) => (
              <button
                key={filter}
                className={
                  placeFilter === filter
                    ? "place-filter active"
                    : "place-filter"
                }
                onClick={() =>
                  setPlaceFilter(filter)
                }
              >
                {filter === "최애"
                  ? "★ 최애"
                  : filter}
              </button>
            ))}
          </div>

          {filteredPlaces.length === 0 && (
            <div className="empty">
              아직 저장한 장소가 없어요.
            </div>
          )}

          <div className="place-list">
            {filteredPlaces.map((savedPlace) => (
              <article
                className="place-card place-card-v2"
                key={savedPlace.id}
              >
                <div className="place-card-top">
                  <span className="place-category">
                    {savedPlace.category}
                  </span>

                  <button
                    className={`place-status-pill status-${savedPlace.status}`}
                    onClick={() =>
                      setStatusTarget(savedPlace)
                    }
                  >
                    {savedPlace.status === "가고싶어" &&
                      "♡ 가고싶어"}

                    {savedPlace.status === "다녀왔어" &&
                      "✓ 다녀왔어"}

                    {savedPlace.status === "최애" &&
                      "★ 최애"}

                    <span className="status-arrow">
                      ›
                    </span>
                  </button>
                </div>

                <h3>{savedPlace.name}</h3>

                {savedPlace.area && (
                  <p className="place-area">
                    📍 {savedPlace.area}
                  </p>
                )}

                {savedPlace.memo && (
                  <p className="place-card-memo">
                    {savedPlace.memo}
                  </p>
                )}

                <div className="place-actions">
                  <button
                    className="place-meeting-button"
                    onClick={() =>
                      makeMeetingFromPlace(savedPlace)
                    }
                  >
                    약속 잡기
                  </button>

                  <button
                    className="place-more-delete"
                    onClick={() =>
                      deletePlace(savedPlace.id)
                    }
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* =====================
          TODO
      ====================== */}

      {activeTab === "todos" && (
        <section>
          <p className="step-label">
            {currentGroup
              ? `${currentGroup.name} / TODO`
              : "MY / TODO"}
          </p>

          <h2 className="section-title">
            {currentGroup ? "우리 할 일" : "할 일"}
          </h2>

          {currentGroup && (
            <p className="places-description">
              그룹원 누구나 추가하고 완료할 수 있어.
            </p>
          )}

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
                  {todo.completed ? "✓" : ""}
                </button>

                <span>{todo.title}</span>

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

      {/* =====================
          GROUP MODAL
      ====================== */}

      {groupModal && (
        <div
          className="status-overlay"
          onClick={() =>
            setGroupModal(false)
          }
        >
          <div
            className="group-sheet"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="sheet-handle" />

            <p className="step-label">
              GROUP
            </p>

            <h2>같이 만나자</h2>

            <div className="group-mode-tabs">
              <button
                className={
                  groupModalMode === "create"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setGroupModalMode("create")
                }
              >
                그룹 만들기
              </button>

              <button
                className={
                  groupModalMode === "join"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setGroupModalMode("join")
                }
              >
                참여하기
              </button>
            </div>

            {groupModalMode === "create" && (
              <div className="group-form">
                <label>그룹 이름</label>

                <input
                  type="text"
                  placeholder="예: 대학 친구들"
                  maxLength={30}
                  value={newGroupName}
                  onChange={(e) =>
                    setNewGroupName(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      createGroup();
                    }
                  }}
                />

                <p>
                  한 번 만든 그룹에서 약속, 장소,
                  TODO를 계속 같이 관리할 수 있어.
                </p>

                <button
                  className="group-main-button"
                  onClick={createGroup}
                  disabled={saving}
                >
                  {saving
                    ? "만드는 중..."
                    : "그룹 만들기"}
                </button>
              </div>
            )}

            {groupModalMode === "join" && (
              <div className="group-form">
                <label>초대코드</label>

                <input
                  className="invite-code-input"
                  type="text"
                  placeholder="6자리 코드"
                  maxLength={6}
                  autoCapitalize="characters"
                  value={inviteCodeInput}
                  onChange={(e) =>
                    setInviteCodeInput(
                      e.target.value.toUpperCase()
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      joinGroup();
                    }
                  }}
                />

                <p>
                  친구에게 받은 MEET 초대코드를
                  입력하면 바로 같은 모임에 들어가.
                </p>

                <button
                  className="group-main-button"
                  onClick={joinGroup}
                  disabled={saving}
                >
                  {saving
                    ? "참여 중..."
                    : "그룹 참여하기"}
                </button>
              </div>
            )}

            <button
              className="sheet-close"
              onClick={() =>
                setGroupModal(false)
              }
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* =====================
          PLACE STATUS
      ====================== */}

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

              <h2>{statusTarget.name}</h2>

              <p>여긴 지금 어떤 곳이야?</p>
            </div>

            <div className="status-choice-list">
              <button
                className={`status-choice ${
                  statusTarget.status === "가고싶어"
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
                  <strong>가고싶어</strong>
                  <small>다음 약속 후보</small>
                </span>

                <span>›</span>
              </button>

              <button
                className={`status-choice ${
                  statusTarget.status === "다녀왔어"
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
                  <strong>다녀왔어</strong>
                  <small>방문 완료</small>
                </span>

                <span>›</span>
              </button>

              <button
                className={`status-choice favorite-choice ${
                  statusTarget.status === "최애"
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
                  <strong>최애</strong>
                  <small>또 가고 싶은 곳</small>
                </span>

                <span>›</span>
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