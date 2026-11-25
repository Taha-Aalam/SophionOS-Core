"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";
import { useAiAccess } from "@/lib/hooks/use-ai-access";
import { useApiKeys } from "@/lib/hooks/use-api-keys";
import { ApiKeyCreateDialog } from "@/components/settings/api-key-create-dialog";
import { ApiKeyPermissionDialog } from "@/components/settings/api-key-permission-dialog";
import { RevokeKeyDialog } from "@/components/settings/revoke-key-dialog";
import { DisableAllAiDialog } from "@/components/settings/disable-all-ai-dialog";

function accessModeLabel(mode: string | undefined): string {
  switch (mode) {
    case "write_enabled":
      return "Read + create/update/delete";
    case "write_limited":
      return "Read + create/update";
    case "read_only":
    default:
      return "Read-only";
  }
}

export function AiAccessCard() {
  const { t } = useI18n();
  const { data, loading, error, refresh, patchSettings, disableAll } =
    useAiAccess();
  const { createKey, revokeKey, updateKey } = useApiKeys();

  const [createOpen, setCreateOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [permKey, setPermKey] = useState<{
    id: string;
    name: string;
    mode: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [toggling, setToggling] = useState(false);

  const keys = useMemo(() => data?.keys ?? [], [data?.keys]);
  const aiEnabled = data?.ai_access_enabled ?? true;
  const writeEnabled = data?.ai_write_access_enabled ?? false;

  async function toggleGlobal(next: boolean) {
    setToggling(true);
    try {
      await patchSettings({ ai_access_enabled: next });
      toast.success(
        next
          ? t("aiAccessCard.aiapiAccessEnabled")
          : t("aiAccessCard.aiapiAccessDisabledExistingKeysStillListed"),
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiAccessCard.failedToUpdate"));
    } finally {
      setToggling(false);
    }
  }

  async function toggleWrite(next: boolean) {
    setToggling(true);
    try {
      await patchSettings({ ai_write_access_enabled: next });
      toast.success(
        next
          ? t("aiAccessCard.apiKeyWriteAccessEnabledPerkeyModeStillApp")
          : t("aiAccessCard.apiKeyWriteAccessDisabled"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiAccessCard.failedToUpdate2"));
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-6">
        <Loader2 className="size-4 animate-spin" />
        {t("aiAccessCard.loadingAiAccess")}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            {aiEnabled ? (
              <Shield className="size-5 text-primary" />
            ) : (
              <ShieldOff className="size-5 text-destructive" />
            )}
            <CardTitle className="text-base">{t("aiAccessCard.globalAiAccess")}</CardTitle>
          </div>
          <CardDescription>
            {t("aiAccessCard.controlWhetherExternalAiClientsAndApiKeysC")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {t("aiAccessCard.globalAiAccess2")} {aiEnabled ? "ON" : "OFF"}
            </span>
            <Button
              type="button"
              size="sm"
              variant={aiEnabled ? "outline" : "default"}
              disabled={toggling}
              onClick={() => void toggleGlobal(!aiEnabled)}
            >
              {aiEnabled ? t("aiAccessCard.turnOff") : t("aiAccessCard.turnOn")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setDisableOpen(true)}
            >
              {t("aiAccessCard.disableAllAiAccess")}
            </Button>
            <Link
              href="/settings/ai-access/activity"
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              {t("aiAccessCard.viewActivity")}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">
              {t("aiAccessCard.apiKeyWrites")} {writeEnabled ? "allowed" : "blocked"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={toggling || !aiEnabled}
              onClick={() => void toggleWrite(!writeEnabled)}
            >
              {writeEnabled ? t("aiAccessCard.disableWrites") : t("aiAccessCard.enableWrites")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("aiAccessCard.disableAllAiAccessTurnsGlobalAccessOffAndR")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t("aiAccessCard.connectedClientsApiKeys")}</CardTitle>
          <CardDescription>
            {t("aiAccessCard.createAKeyForATrustedToolKeysAreShownOnceL")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            {t("aiAccessCard.createNewKey")}
          </Button>
          <Separator />
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("aiAccessCard.noActiveApiKeysCreateOneToConnectClaudeCod")}
            </p>
          ) : (
            <ul className="space-y-4">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {k.client_name || k.name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("goals.tabs.active")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {k.name}
                      {k.key_prefix ? ` · ${k.key_prefix}` : ""}
                      {k.client_type ? ` · ${k.client_type}` : ""}
                    </p>
                    <p className="text-sm">
                      {accessModeLabel(k.access_mode as string)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("aiAccessCard.lastUsed")}{" "}
                      {k.last_used_at
                        ? formatDateTime(k.last_used_at)
                        : "Never"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPermKey({
                          id: k.id,
                          name: k.name,
                          mode: (k.access_mode as string) ?? "read_only",
                        })
                      }
                    >
                      {t("aiAccessCard.changeAccess")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setRevokeTarget({ id: k.id, name: k.name })
                      }
                    >
                      {t("aiAccessCard.revoke")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiAccessCard.privacyNote")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("aiAccessCard.sophionosDoesNotTrainAiModelsOnYourPrivate")}</p>
          <p>
            {t("aiAccessCard.sophionosDoesNotSendYourDataToAnAiModelByD")}
          </p>
        </CardContent>
      </Card>

      <ApiKeyCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (payload) => {
          const result = await createKey(payload);
          await refresh();
          return result;
        }}
      />
      <ApiKeyPermissionDialog
        open={!!permKey}
        onOpenChange={(o) => {
          if (!o) setPermKey(null);
        }}
        keyId={permKey?.id ?? null}
        keyName={permKey?.name ?? ""}
        currentMode={permKey?.mode ?? "read_only"}
        onSave={async (id, accessMode) => {
          await updateKey(id, { access_mode: accessMode });
          await refresh();
        }}
      />
      <RevokeKeyDialog
        open={!!revokeTarget}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
        keyId={revokeTarget?.id ?? null}
        keyName={revokeTarget?.name ?? ""}
        onConfirm={async (id) => {
          await revokeKey(id);
          await refresh();
        }}
      />
      <DisableAllAiDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onConfirm={async () => {
          const result = await disableAll();
          await refresh();
          return result;
        }}
      />
    </div>
  );
}
