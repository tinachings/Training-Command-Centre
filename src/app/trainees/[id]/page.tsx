"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AssessmentRecord = {
  id: number;
  assessmentType: string;
  date: string;
  outcome: string;
};

type WeeklyPlannerItem = {
  id: number;
  activityType: string;
  plannedDate: string;
  status: string;
};

type FollowUpAction = {
  id: number;
  title: string;
  status: string;
  dueDate: string;
};

type RefresherRecord = {
  id: number;
  process: string;
  refresherDueDate: string;
  status: string;
};

type TraineeProcess = {
  id: number;
  stage: string;
  status: string;
  trainingBuddy: string | null;
  trainingStartDate: string | null;
  readinessScore: number | null;
  cumulativeLoggedHours: string;
  recommendedTrainingHours: string | null;
  requires50PercentCheckIn: boolean;
  requires90PercentCheckIn: boolean;
  fiftyPercentReachedDate: string | null;
  ninetyPercentReachedDate: string | null;
  nextAction: string | null;
  followUpFlag: string | null;
  competencySignOffDate: string | null;
  process: {
    id: number;
    name: string;
  };
  assessmentRecords: AssessmentRecord[];
  weeklyPlannerItems: WeeklyPlannerItem[];
  followUpActions: FollowUpAction[];
  refresherRecord: RefresherRecord | null;
};

type TimelineEvent = {
  id: string;
  eventType: string;
  date: string;
  description: string;
  user: string;
};

type TraineeProfile = {
  id: number;
  name: string;
  departmentId: number;
  teamLeader: string | null;
  shiftLeader: string | null;
  trainingAssessor: string | null;
  shift: string | null;
  startDate: string | null;
  createdAt: string;
  department: {
    name: string;
  };
  traineeProcesses: TraineeProcess[];
  timeline: TimelineEvent[];
};

export default function TraineeProfilePage() {
  const params = useParams<{ id: string }>();
  const traineeId = Number(params.id);
  const hasValidTraineeId = Number.isInteger(traineeId) && traineeId > 0;
  const [trainee, setTrainee] = useState<TraineeProfile | null>(null);
  const [loading, setLoading] = useState(hasValidTraineeId);

  useEffect(() => {
    if (!hasValidTraineeId) {
      return;
    }

    const controller = new AbortController();

    async function loadTrainee() {
      try {
        const response = await fetch(`/api/trainees/${traineeId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setTrainee(null);
          return;
        }

        setTrainee((await response.json()) as TraineeProfile);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setTrainee(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTrainee();
    return () => controller.abort();
  }, [hasValidTraineeId, traineeId]);

  const assignments = useMemo(
    () => trainee?.traineeProcesses ?? [],
    [trainee],
  );
  const activeAssignments = assignments.filter(
    (item) => item.status !== "Competent" && item.status !== "Archived",
  );
  const completedAssignments = assignments.filter(
    (item) => item.status === "Competent" || item.stage === "Competent",
  );
  const history = assignments.flatMap((item) => item.assessmentRecords);
  const plannerItems = assignments.flatMap((item) => item.weeklyPlannerItems);
  const refresherItems = assignments.flatMap((item) =>
    item.refresherRecord ? [item.refresherRecord] : [],
  );
  const followUpActions = assignments.flatMap((item) => item.followUpActions);
  const flaggedAssignments = assignments.filter(
    (item) =>
      item.followUpFlag &&
      item.followUpFlag !== "NONE" &&
      item.followUpActions.length === 0,
  );
  const milestoneAssignments = activeAssignments.filter(
    (item) =>
      item.requires50PercentCheckIn || item.requires90PercentCheckIn,
  );
  const followUpCount =
    followUpActions.length +
    flaggedAssignments.length +
    milestoneAssignments.length;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Loading trainee profile...
      </div>
    );
  }

  if (!trainee) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Trainee not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
            Trainee Profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{trainee.name}</h2>
          <p className="mt-2 text-slate-600">
            Overview of assigned training processes, assessment history,
            follow-up actions and the next training step.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/trainees/${trainee.id}/assign`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Assign Process
          </Link>
          <Link
            href={`/trainees/${trainee.id}/edit`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
          >
            Edit Colleague
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Department", trainee.department.name],
          ["Team Leader", trainee.teamLeader],
          ["Shift Leader", trainee.shiftLeader],
          ["Shift", trainee.shift],
          ["Active Training", String(activeAssignments.length)],
          ["Competent Processes", String(completedAssignments.length)],
          ["Follow-Up Required", followUpCount > 0 ? "Yes" : "No"],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {value || "-"}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold">Active Training Processes</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 text-left">Process</th>
                <th className="pb-2 text-left">Stage</th>
                <th className="pb-2 text-left">Training Buddy</th>
                <th className="pb-2 text-left">Start Date</th>
                <th className="pb-2 text-left">Readiness</th>
                <th className="pb-2 text-left">Next Action</th>
                <th className="pb-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeAssignments.length === 0 ? (
                <tr className="border-t border-slate-200">
                  <td className="py-3 text-slate-600" colSpan={7}>
                    No active training processes.
                  </td>
                </tr>
              ) : (
                activeAssignments.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="py-3">
                      <div className="space-y-2">
                        <span>{item.process.name}</span>
                        {item.requires50PercentCheckIn ||
                        item.requires90PercentCheckIn ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.requires50PercentCheckIn ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                50% Check-In Required
                              </span>
                            ) : null}
                            {item.requires90PercentCheckIn ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                                Final Check-In Required
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3">{item.stage}</td>
                    <td className="py-3">{item.trainingBuddy ?? "TBD"}</td>
                    <td className="py-3">
                      {item.trainingStartDate?.slice(0, 10) ?? "TBD"}
                    </td>
                    <td className="py-3">
                      {item.readinessScore === null
                        ? "Not Set"
                        : `${item.readinessScore}%`}
                    </td>
                    <td className="py-3">{item.nextAction || "-"}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/trainees/${trainee.id}/processes/${item.id}`}
                          className="rounded-full bg-sky-50 px-3 py-1 text-sky-700"
                        >
                          View
                        </Link>
                        <Link
                          href={`/trainees/${trainee.id}/training-hours/${item.id}`}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
                        >
                          Log Training Hours
                        </Link>
                        <Link
                          href={`/trainees/${trainee.id}/check-in/${item.id}`}
                          className="rounded-full bg-amber-50 px-3 py-1 text-amber-700"
                        >
                          Add Check-In
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">
            Completed / Competent Processes
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {completedAssignments.length ? (
              completedAssignments.map((item) => (
                <li key={item.id} className="rounded-xl bg-emerald-50 p-3">
                  {item.process.name} | {item.stage} |{" "}
                  {item.competencySignOffDate?.slice(0, 10) ?? "Signed off"}
                </li>
              ))
            ) : (
              <li>No completed processes yet.</li>
            )}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">Assessment History</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {history.length ? (
              history.map((item) => (
                <li key={item.id} className="rounded-xl bg-sky-50 p-3">
                  {item.assessmentType} | {item.date.slice(0, 10)} |{" "}
                  {item.outcome}
                </li>
              ))
            ) : (
              <li>No assessments recorded yet.</li>
            )}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">Weekly Planner Items</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {plannerItems.length ? (
              plannerItems.map((item) => (
                <li key={item.id} className="rounded-xl bg-amber-50 p-3">
                  {item.activityType} | {item.plannedDate.slice(0, 10)} |{" "}
                  {item.status}
                </li>
              ))
            ) : (
              <li>No weekly planner items yet.</li>
            )}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">Refresher Records</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {refresherItems.length ? (
              refresherItems.map((item) => (
                <li key={item.id} className="rounded-xl bg-violet-50 p-3">
                  {item.process} | {item.status} | Due{" "}
                  {item.refresherDueDate.slice(0, 10)}
                </li>
              ))
            ) : (
              <li>No refresher records yet.</li>
            )}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="text-lg font-semibold">Follow-Up Actions</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {followUpCount === 0 ? (
            <li>No follow-up actions currently flagged.</li>
          ) : (
            <>
              {followUpActions.map((item) => (
                <li key={`action-${item.id}`} className="rounded-xl bg-rose-50 p-3">
                  {item.title} | {item.status} | Due {item.dueDate.slice(0, 10)}
                </li>
              ))}
              {flaggedAssignments.map((item) => (
                <li key={`flag-${item.id}`} className="rounded-xl bg-rose-50 p-3">
                  {item.process.name} | {item.followUpFlag} |{" "}
                  {item.nextAction || "Review required"}
                </li>
              ))}
            </>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="text-lg font-semibold">Training Timeline</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {trainee.timeline.map((event) => (
            <li key={event.id} className="rounded-xl bg-slate-50 p-3">
              {event.date.slice(0, 10)} | {event.eventType} |{" "}
              {event.description}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
