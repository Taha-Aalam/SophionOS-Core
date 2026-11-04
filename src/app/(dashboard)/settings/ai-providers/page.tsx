import { AiProvidersContent } from "@/components/settings/ai-providers-content";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function AiProvidersPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title="AI Providers"
        description="Connect your own AI provider keys (Claude, GPT, Gemini, Grok, OpenRouter, or any OpenAI-compatible endpoint). Keys are stored encrypted and only used server-side for features you enable."
      />

      <AiProvidersContent />
    </div>
  );
}
