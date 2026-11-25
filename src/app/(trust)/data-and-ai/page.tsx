import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { SparklesIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Data & AI | SophionOS",
  description: "How MCP, API keys, and AI clients access SophionOS.",
};

export default async function DataAndAiPage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={SparklesIcon}
      title={t("legal.dataAndAi")}
      description={t("legal.dataAndAi.howMcpApiKeysAndAiClientsAccessYourData")}
    >
      <PolicyMeta
        version="2.2"
        effective="October 25, 2026"
        summary={t("legal.dataAndAi.addsYourOwnProviderKeySettingsAiProvidersAndTheOptionalA")}
      />

      <h2>{t("legal.dataAndAi.defaultBehavior")}</h2>
      <p>
        {t("legal.dataAndAi.sophionosDoesNotCallOpenaiAnthropicOrAnyOtherModelHostWi")}
      </p>
      <p>
        {t("legal.dataAndAi.weDoNotTrainModelsOnYourWorkspaceContentAndWeDoNotUseItT")}
      </p>

      <h2>{t("legal.dataAndAi.yourOwnProviderKeyBriefSummaries")}</h2>
      <p>
        {t("legal.dataAndAi.separatelyFromMcpClientsYouCanConnectYourOwnAiProviderAp")} <a href="/settings/ai-providers">{t("notificationsContent.settingsAiProviders")}</a> {t("legal.dataAndAi.andTurnOnAiSummariesInSettingsNotificationsWhenASchedule")}
      </p>
      <p>
        {t("legal.dataAndAi.theRequestRunsUnderYourProviderAccountSoThatProvidersTer")}
      </p>

      <h2>{t("legal.dataAndAi.connectionFlow")}</h2>
      <ol>
        <li>{t("legal.dataAndAi.createAnApiKeyInSettingsAiAccessDefaultReadonly")}</li>
        <li>
          {t("legal.dataAndAi.configureYourMcpClientClaudeDesktopClaudeCodeCursorCodex")}
        </li>
        <li>
          {t("legal.dataAndAi.theClientCallsTheSophionosRestApiSophionosEnforcesAuthen")}
        </li>
        <li>
          {t("legal.dataAndAi.revokeTheKeyOrUseLdquodisableAllAiAccessrdquoToCutOffFur")}
        </li>
      </ol>

      <h2>{t("legal.dataAndAi.accessModes")}</h2>
      <ul>
        <li>
          <strong>{t("legal.dataAndAi.readonly")}</strong>{t("legal.dataAndAi.queryContextCannotCreateUpdateOrDelete")}
        </li>
        <li>
          <strong>{t("legal.dataAndAi.writelimited")}</strong>{t("legal.dataAndAi.createAndUpdateSelectedEntitiesNoPermanentDeleteOrArchiv")}
        </li>
        <li>
          <strong>{t("legal.dataAndAi.writeenabled")}</strong>{t("legal.dataAndAi.broaderWritesIncludingArchivePermanentDeleteRemainsDashb")}
        </li>
      </ul>
      <p>
        {t("legal.dataAndAi.manageConnectionsIn")}{" "}
        <a href="/settings/ai-access">{t("legal.dataAndAi.settingsAiAccess")}</a> {t("legal.dataAndAi.signedIn")}
      </p>

      <h2>{t("legal.dataAndAi.whoIsResponsibleForWhat")}</h2>
      <p>
        {t("legal.dataAndAi.onceAClientIsConnectedTwoThingsAreTrueAtOnceAndItIsWorth")}
      </p>
      <ul>
        <li>
          <strong>{t("legal.dataAndAi.sophionosIsResponsibleFor")}</strong> {t("legal.dataAndAi.whatItServesAndRefusesAuthenticatingTheKeyEnforcingTheMo")}
        </li>
        <li>
          <strong>{t("legal.dataAndAi.youAndYourClientAreResponsibleFor")}</strong> {t("legal.dataAndAi.whatLeavesSophionosTheClientAndItsModelProviderProcessWh")}
        </li>
      </ul>
      <p>
        {t("legal.dataAndAi.thatMeansThePrivacyPolicyOfTheAssistantYouUseMattersAsMu")}
      </p>

      <h2>{t("legal.dataAndAi.whatAnAiClientCannotDo")}</h2>
      <ul>
        <li>{t("legal.dataAndAi.itCannotPermanentlyDeleteYourDataWhateverItsWriteMode")}</li>
        <li>
          {t("legal.dataAndAi.itCannotKeepWorkingAfterYouRevokeItsKeyOrDisableAiAccess")}
        </li>
        <li>
          {t("legal.dataAndAi.itCannotActWhileGlobalAiAccessIsDisabledEvenWithAValidKe")}
        </li>
        <li>
          {t("legal.dataAndAi.itCannotExceedTheRateLimitOfYourPlanItWillGetA429")}
        </li>
      </ul>

      <h2>{t("legal.dataAndAi.promptInjectionAndToolAbuse")}</h2>
      <p>
        {t("legal.dataAndAi.theApiAndMcpServerAreExperimentalIfYouImportUntrustedCon")}
      </p>

      <h2>{t("legal.dataAndAi.yourRightsOverDataAlreadyShared")}</h2>
      <p>
        {t("legal.dataAndAi.youCanExportYourDataAndDeleteYourAccountFrom")}{" "}
        <a href="/settings/privacy">{t("legal.dataAndAi.settingsPrivacyData")}</a> {t("legal.dataAndAi.atAnyTimeDeletingYourAccountRemovesItFromSophionosItDoes")} <a href="/privacy">{t("legal.privacy")}</a> {t("legal.dataAndAi.forTheFullPicture")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("legal.security.thisPageIsProductDocumentationNotLegalCounsel")}
      </p>
      <p>
        {t("legal.privacy.related")} <a href="/privacy">{t("legal.privacy")}</a> ·{" "}
        <a href="/security">{t("legal.security")}</a> · <a href="/subprocessors">{t("legal.subprocessors")}</a>{" "}
        · <a href="/terms">{t("legal.terms")}</a>
      </p>
    </TrustPage>
  );
}
