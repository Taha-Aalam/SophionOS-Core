"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "zustand";

import { useAuth } from "@/components/providers/auth-provider";
import { useCreateGoal } from "@/lib/hooks/use-goals";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { userSettingsService, type OnboardingState } from "@/lib/services/user-settings.service";
import { createOnboardingStore } from "@/lib/stores/onboarding.store";
import { ONBOARDING_STEP_META } from "@/lib/onboarding/steps";
import { GOAL_TERM } from "@/lib/utils/constants";

import { StepShell } from "@/components/onboarding/step-shell";
import { AreasStep } from "@/components/onboarding/areas-step";
import { GoalStep, type GoalStepValue } from "@/components/onboarding/goal-step";
import { ProjectStep, type ProjectStepValue } from "@/components/onboarding/project-step";
import { TasksStep } from "@/components/onboarding/tasks-step";
import { ExplainerStep } from "@/components/onboarding/explainer-step";

export function OnboardingContent({
  initialState,
}: {
  initialState: OnboardingState;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const createGoal = useCreateGoal();
  const createProject = useCreateProject();
  const createTask = useCreateTask();

  // One store per mount, hydrated from the server-persisted step so refresh /
  // back-nav resumes where the user left off.
  const store = useMemo(
    () =>
      createOnboardingStore({
        current_step: initialState.current_step,
        draft: initialState.draft ?? {},
      }),
    [initialState],
  );
  const state = useStore(store);
  const meta = ONBOARDING_STEP_META[state.currentStep];

  const [goal, setGoal] = useState<GoalStepValue>({ name: "", description: "" });
  const [project, setProject] = useState<ProjectStepValue>({ name: "", description: "" });
  const [tasks, setTasks] = useState<string[]>(["", "", ""]);
  const [isBusy, setIsBusy] = useState(false);

  // Ids of entities created during the wizard, kept in the store draft so a
  // back/forward round-trip never creates a second goal/project.
  const draft = state.draft as {
    goal_id?: string;
    project_id?: string;
    tasks_created?: boolean;
  };

  async function persist(next: Partial<OnboardingState>) {
    if (!user) return;
    await userSettingsService.setOnboardingState(user.id, {
      completed: false,
      current_step: state.currentStep,
      draft: store.getState().draft,
      ...next,
    });
  }

  async function handleNext() {
    if (!user) return;
    setIsBusy(true);
    try {
      // Create the step's entity once, then record its id in the draft.
      if (state.currentStep === "goal" && goal.name.trim() && !draft.goal_id) {
        const created = await createGoal.mutateAsync({
          name: goal.name.trim(),
          description: goal.description.trim() || null,
          term: GOAL_TERM.SHORT,
        });
        store.getState().setDraft({ goal_id: created.id });
      }

      if (state.currentStep === "project" && project.name.trim() && !draft.project_id) {
        const created = await createProject.mutateAsync({
          name: project.name.trim(),
          description: project.description.trim() || null,
          goal_ids: draft.goal_id ? [draft.goal_id] : undefined,
        });
        store.getState().setDraft({ project_id: created.id });
      }

      if (state.currentStep === "tasks" && !draft.tasks_created) {
        const names = tasks.map((t) => t.trim()).filter(Boolean);
        for (const name of names) {
          await createTask.mutateAsync({
            name,
            project_ids: draft.project_id ? [draft.project_id] : undefined,
          });
        }
        if (names.length) store.getState().setDraft({ tasks_created: true });
      }

      if (state.isLastStep) {
        await persist({ completed: true, completed_at: new Date().toISOString() });
        router.replace("/dashboard");
        return;
      }

      store.getState().next();
      await persist({ current_step: store.getState().currentStep });
    } catch {
      // Mutation hooks already surface a toast; keep the user on the step.
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBack() {
    store.getState().back();
    await persist({ current_step: store.getState().currentStep });
  }

  async function handleSkip() {
    if (state.isLastStep) return;
    store.getState().next();
    await persist({ current_step: store.getState().currentStep });
  }

  // Action steps that need input gate the Continue button.
  const canAdvance =
    state.currentStep === "goal"
      ? goal.name.trim().length > 0 || Boolean(draft.goal_id)
      : true;

  return (
    <StepShell
      meta={meta}
      stepIndex={state.stepIndex}
      isFirstStep={state.isFirstStep}
      isLastStep={state.isLastStep}
      canAdvance={canAdvance}
      isBusy={isBusy}
      nextLabel={state.currentStep === "goal" && !canAdvance ? "Add a goal to continue" : undefined}
      onBack={handleBack}
      onNext={handleNext}
      onSkip={meta.kind === "explainer" ? handleSkip : undefined}
    >
      {state.currentStep === "areas" && <AreasStep />}
      {state.currentStep === "goal" && <GoalStep value={goal} onChange={setGoal} />}
      {state.currentStep === "project" && (
        <ProjectStep value={project} onChange={setProject} goalName={goal.name.trim() || undefined} />
      )}
      {state.currentStep === "tasks" && (
        <TasksStep value={tasks} onChange={setTasks} projectName={project.name.trim() || undefined} />
      )}
      {meta.kind === "explainer" && <ExplainerStep meta={meta} />}
    </StepShell>
  );
}
