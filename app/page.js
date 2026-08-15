"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


// ================================
// D-DAY 계산
// ================================

function getDday(dateString) {
  if (!dateString) return "";

  const today = new Date();
  const target = new Date(
    dateString + "T00:00:00"
  );

  today.setHours(0, 0, 0, 0);

  const difference =
    target.getTime() - today.getTime();

  const days = Math.round(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days === 0) {
    return "D-DAY";
  }

  if (days > 0) {
    return `D-${days}`;
  }

  return `D+${Math.abs(days)}`;
}


export default function Home() {

  const [step, setStep] = useState(0);

  // 입력값
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [plan, setPlan] = useState("");
  const [place, setPlace] = useState("");

  // Supabase에서 가져온 약속
  const [meetings, setMeetings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  // ================================
  // 사이트 처음 열었을 때
  // 약속 불러오기
  // ================================

  useEffect(() => {
    loadMeetings();
  }, []);


  async function loadMeetings() {

    setLoading(true);

    const { data, error } =
      await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

    if (error) {

      console.error(
        "약속 불러오기 실패:",
        error
      );

      setLoading(false);

      return;
    }

    setMeetings(data || []);

    setLoading(false);
  }


  // ================================
  // 약속 만들기
  // ================================

  async function createMeeting() {

    const { error } =
      await supabase
        .from("meetings")
        .insert([
          {
            title: title,
            meeting_date:
              date || null,

            start_time:
              startTime || null,

            end_time:
              endTime || null,

            plan: plan,
            place: place,

            completed: false,
          },
        ]);

    if (error) {

      console.error(
        "약속 저장 실패:",
        error
      );

      alert(
        "약속 저장에 실패했어요."
      );

      return;
    }

    // 입력값 초기화

    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlan("");
    setPlace("");

    // DB에서 다시 불러오기
    await loadMeetings();

    // 홈으로
    setStep(0);
  }


  // ================================
  // 약속 삭제
  // ================================

  async function deleteMeeting(id) {

    const ok = window.confirm(
      "이 약속을 삭제할까요?"
    );

    if (!ok) return;

    const { error } =
      await supabase
        .from("meetings")
        .delete()
        .eq("id", id);

    if (error) {

      console.error(
        "삭제 실패:",
        error
      );

      alert(
        "삭제에 실패했어요."
      );

      return;
    }

    await loadMeetings();
  }


  // ================================
  // 완료 체크
  // ================================

  async function toggleComplete(meeting) {

    const { error } =
      await supabase
        .from("meetings")
        .update({
          completed:
            !meeting.completed,
        })
        .eq("id", meeting.id);

    if (error) {

      console.error(
        "완료 변경 실패:",
        error
      );

      return;
    }

    await loadMeetings();
  }


  return (

    <main>


      {/* ================================
          HOME
      ================================= */}

      {step === 0 && (
        <>

          <header className="home-header">

            <h1>MEET</h1>

            <p>
              어디서 머할까?
            </p>

          </header>


          {/* 불러오는 중 */}

          {loading && (

            <div className="empty">

              약속 불러오는 중...

            </div>

          )}


          {/* 약속 없음 */}

          {!loading &&
            meetings.length === 0 && (

              <div className="empty">

                아직 약속이 없어요.

              </div>

            )}


          {/* 약속 목록 */}

          {!loading &&
            meetings.length > 0 && (

              <section
                className="meeting-list"
              >

                <p className="step-label">
                  UPCOMING
                </p>


                {meetings.map(
                  (meeting) => (

                    <div
                      key={meeting.id}

                      className={`meeting-card ${
                        meeting.completed
                          ? "completed"
                          : ""
                      }`}
                    >


                      {/* D-DAY */}

                      <div className="dday">

                        {getDday(
                          meeting.meeting_date
                        )}

                      </div>


                      {/* 제목 */}

                      <div
                        className="meeting-top"
                      >

                        <button
                          className="check-button"

                          onClick={() =>
                            toggleComplete(
                              meeting
                            )
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


                      {/* 정보 */}

                      <div
                        className="meeting-info"
                      >

                        <p>
                          📅{" "}
                          {meeting.meeting_date ||
                            "날짜 미정"}
                        </p>


                        <p>

                          ⏰{" "}

                          {meeting.start_time
                            ? meeting.start_time.slice(
                                0,
                                5
                              )
                            : "시간 미정"}

                          {meeting.end_time &&
                            ` ~ ${meeting.end_time.slice(
                              0,
                              5
                            )}`}

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

                  )
                )}

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


      {/* ================================
          STEP 1
          약속 이름
      ================================= */}

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

            onClick={() =>
              setStep(0)
            }
          >
            ← 돌아가기
          </button>

        </section>

      )}


      {/* ================================
          STEP 2
          언제 만날까?
      ================================= */}

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


      {/* ================================
          STEP 3
          뭐 할까?
      ================================= */}

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


      {/* ================================
          STEP 4
          어디서?
      ================================= */}

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
              setPlace(
                e.target.value
              )
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


      {/* ================================
          CONFIRM
      ================================= */}

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
            onClick={
              createMeeting
            }
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