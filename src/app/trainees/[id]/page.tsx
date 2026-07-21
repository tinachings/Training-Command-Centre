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
  assignmentStatus: string;
  removedAt: string | null;
  removalNote: string | null;
  removedBy: string | null;
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
  const [removeTarget, setRemoveTarget] = useState<TraineeProcess | null>(null);
  const [removeReason, setRemoveReason] = useState<
    "ASSIGNED_BY_MISTAKE" | "NO_LONGER_REQUIRED"
  >("NO_LONGER_REQUIRED");
  const [removeNote, setRemoveNote] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removePreview, setRemovePreview] = useState<{
    assignedByMistake?: {
      allowed: boolean;
      blockingDependencies: Array<{ type: string; count: number }>;
      safeCleanup: {
        timelineEvents: number;
        weeklyPlannerItems: number;
      };
    };
  } | null>(null);
  const [removing, setRemoving] = useState(false);

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
    (item) =>
      item.assignmentStatus === "ACTIVE" &&
      item.status !== "Competent" &&
      item.status !== "Archived",
  );
  const completedAssignments = assignments.filter(
    (item) =>
      item.assignmentStatus === "ACTIVE" &&
      (item.status === "Competent" || item.stage === "Competent"),
  );
  const noLongerRequiredAssignments = assignments.filter(
    (item) => item.assignmentStatus === "NO_LONGER_REQUIRED",
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

  async function openRemoveProcess(item: TraineeProcess) {
    setRemoveTarget(item);
    setRemoveReason("NO_LONGER_REQUIRED");
    setRemoveNote("");
    setRemoveError("");
    setRemovePreview(null);

    try {
      const response = await fetch(
        `/api/trainees/${traineeId}/processes/${item.id}/remove`,
        { cache: "no-store" },
      );

      if (response.ok) {
        setRemovePreview(await response.json());
      }
    } catch {
      setRemovePreview(null);
    }
  }

  async function submitRemoveProcess() {
    if (!trainee || !removeTarget) {
      return;
    }

    setRemoveError("");

    if (removeReason === "NO_LONGER_REQUIRED" && !removeNote.trim()) {
      setRemoveError("Enter a short reason before confirming.");
      return;
    }

    setRemoving(true);

    try {
      const response = await fetch(
        `/api/trainees/${trainee.id}/processes/${removeTarget.id}/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: removeReason,
            note: removeNote,
            user: trainee.trainingAssessor || trainee.teamLeader || "User",
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        recommendation?: string;
      } | null;

      if (!response.ok) {
        setRemoveError(
          [data?.error, data?.recommendation].filter(Boolean).join(" ") ||
            "Failed to remove process.",
        );
        return;
      }

      const reload = await fetch(`/api/trainees/${trainee.id}`, {
        cache: "no-store",
      });

      if (reload.ok) {
        setTrainee((await reload.json()) as TraineeProfile);
      }

      setRemoveTarget(null);
    } catch {
      setRemoveError("Failed to remove process.");
    } finally {
      setRemoving(false);
    }
  }

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
                        <button
                          type="button"
                          onClick={() => void openRemoveProcess(item)}
                          className="rounded-full bg-rose-50 px-3 py-1 text-rose-700"
                        >
                          Remove Process
                        </button>
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

      {noLongerRequiredAssignments.length ? (
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-semibold">No Longer Required</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {noLongerRequiredAssignments.map((item) => (
              <li key={item.id} className="rounded-xl bg-slate-50 p-3">
                {item.process.name} | Removed{" "}
                {item.removedAt?.slice(0, 10) ?? "date not recorded"} |{" "}
                {item.removalNote || "No reason recorded"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      {removeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              Remove {removeTarget.process.name}
            </h3>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="radio"
                  checked={removeReason === "NO_LONGER_REQUIRED"}
                  onChange={() => setRemoveReason("NO_LONGER_REQUIRED")}
                />
                <span>
                  <strong>No longer required</strong>
                  <br />
                  Preserve all history, stop future work, and show N in the
                  Production Matrix.
                </span>
              </label>
              <label className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="radio"
                  checked={removeReason === "ASSIGNED_BY_MISTAKE"}
                  onChange={() => setRemoveReason("ASSIGNED_BY_MISTAKE")}
                />
                <span>
                  <strong>Assigned by mistake</strong>
                  <br />
                  Permanently remove only if there is no training or competency
                  history.
                </span>
              </label>
            </div>
            {removeReason === "ASSIGNED_BY_MISTAKE" &&
            removePreview?.assignedByMistake ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {removePreview.assignedByMistake.allowed ? (
                  <p>
                    Safe to permanently remove. Cleanup includes{" "}
                    {removePreview.assignedByMistake.safeCleanup.timelineEvents}{" "}
                    timeline event(s) and{" "}
                    {
                      removePreview.assignedByMistake.safeCleanup
                        .weeklyPlannerItems
                    }{" "}
                    planner item(s).
                  </p>
                ) : (
                  <p>
                    Permanent deletion is blocked because history exists. Use No
                    longer required to preserve it.
                  </p>
                )}
              </div>
            ) : null}
            {removeReason === "NO_LONGER_REQUIRED" ? (
              <label className="mt-4 block space-y-2 text-sm">
                <span>Removal reason</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3"
                  value={removeNote}
                  onChange={(event) => setRemoveNote(event.target.value)}
                />
              </label>
            ) : null}
            {removeError ? (
              <p className="mt-3 text-sm font-medium text-rose-700">
                {removeError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void submitRemoveProcess()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {removing ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
