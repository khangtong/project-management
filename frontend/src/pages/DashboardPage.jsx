import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { dashboardApi } from "../api/dashboard";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.get().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-cream-dark rounded-2xl" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-48 bg-cream-dark rounded-2xl" />
              <div className="h-48 bg-cream-dark rounded-2xl" />
              <div className="h-48 bg-cream-dark rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { my_tasks = [], overdue_tasks = [], upcoming_tasks = [] } = data || {};

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-sage rounded-2xl p-5">
            <div className="text-sm font-medium text-gray-mid mb-1">
              My Tasks
            </div>
            <div className="text-3xl font-bold text-charcoal">
              {my_tasks.length}
            </div>
            <div className="text-xs text-gray-mid mt-1">assigned to you</div>
          </div>
          <div className="bg-[#FFB4A2] rounded-2xl p-5">
            <div className="text-sm font-medium text-gray-mid mb-1">
              Overdue
            </div>
            <div className="text-3xl font-bold text-charcoal">
              {overdue_tasks.length}
            </div>
            <div className="text-xs text-gray-mid mt-1">past due date</div>
          </div>
          <div className="bg-ocean rounded-2xl p-5">
            <div className="text-sm font-medium text-white/80 mb-1">
              Upcoming
            </div>
            <div className="text-3xl font-bold text-white">
              {upcoming_tasks.length}
            </div>
            <div className="text-xs text-white/70 mt-1">next 7 days</div>
          </div>
        </div>

        <div className="space-y-6">
          {overdue_tasks.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-charcoal mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Overdue Tasks
              </h2>
              <div className="space-y-2">
                {overdue_tasks.map((task) => (
                  <TaskRow key={task.id} task={task} isOverdue />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-charcoal mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ocean" />
              Upcoming (Next 7 Days)
            </h2>
            <div className="space-y-2">
              {upcoming_tasks.length === 0 ? (
                <p className="text-gray-medium text-sm py-4">
                  No upcoming tasks.
                </p>
              ) : (
                upcoming_tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-charcoal mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage" />
              All My Tasks
            </h2>
            <div className="space-y-2">
              {my_tasks.length === 0 ? (
                <p className="text-gray-medium text-sm py-4">
                  No tasks assigned to you.
                </p>
              ) : (
                my_tasks.map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, isOverdue = false }) {
  const projectName = task.column?.board?.project?.name || "Unknown Project";
  const columnName = task.column?.name || "Unknown Column";

  return (
    <Link
      to={`/projects/${task.column?.board?.project?.id}/board`}
      className="block"
    >
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-cream-border hover:bg-cream-card transition-colors">
        <div className="flex-shrink-0">
          <div
            className={`w-3 h-3 rounded-full ${
              isOverdue ? "bg-red-500" : "bg-ocean"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-charcoal">{task.title}</h3>
          <p className="text-xs text-gray-medium mt-0.5">
            {projectName} / {columnName}
          </p>
        </div>
        {task.due_date && (
          <div
            className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-medium"}`}
          >
            {format(new Date(task.due_date), "MMM d, yyyy")}
          </div>
        )}
        <div
          className={`text-xs px-2 py-0.5 rounded border ${
            task.priority === "urgent"
              ? "bg-red-100 text-red-700 border-red-200"
              : task.priority === "high"
                ? "bg-orange-100 text-orange-700 border-orange-200"
                : "bg-sage/20 text-sage"
          }`}
        >
          {task.priority}
        </div>
      </div>
    </Link>
  );
}
