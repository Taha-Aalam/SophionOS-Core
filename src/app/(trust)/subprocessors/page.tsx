import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { BriefcaseBusinessIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Subprocessors | SophionOS",
  description: "Vendors that may process SophionOS data.",
};

export default async function SubprocessorsPage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={BriefcaseBusinessIcon}
      title={t("legal.subprocessors")}
      description={t("legal.subprocessors.vendorsThatMayProcessSophionosData")}
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary={t("legal.subprocessors.replacesThePreviousVendorListNamesTheActualVendorsNowInU")}
      />

      <p>
        {t("legal.subprocessors.underIndiasDpdpAct2023TahaAalamSoleProprietorTradingAsSo")}
      </p>
      <p>
        {t("legal.subprocessors.dodoPaymentsIsTheExceptionItIsOurMerchantOfRecordAndTheS")}{" "}
        <a href="https://dodopayments.com/privacy-policy">{t("legal.subprocessors.privacyPolicy")}</a>{" "}
        {t("legal.subprocessors.appliesToThatDataSeeSection41OfThe")}{" "}
        <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a>.
      </p>

      <h2>{t("legal.subprocessors.sophionosCloud")}</h2>
      <table>
        <thead>
          <tr>
            <th>{t("legal.subprocessors.vendor")}</th>
            <th>{t("legal.privacy.purpose")}</th>
            <th>{t("legal.subprocessors.dataInvolved")}</th>
            <th>{t("legal.subprocessors.location")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.clerk")}</td>
            <td>{t("legal.subprocessors.authenticationSessionsAccountIdentity")}</td>
            <td>{t("legal.subprocessors.emailNameProfileImageUserIdSessionRecords")}</td>
            <td>{t("legal.subprocessors.unitedStates")}</td>
          </tr>
          <tr>
            <td>{t("legal.subprocessors.supabase")}</td>
            <td>{t("legal.subprocessors.databaseAndHosting")}</td>
            <td>
              {t("legal.subprocessors.yourWorkspaceContentSettingsHashedApiKeysBillingMetadata")}
            </td>
            <td>{t("legal.subprocessors.unitedStates")}</td>
          </tr>
          <tr>
            <td>{t("legal.subprocessors.vercel")}</td>
            <td>{t("legal.subprocessors.applicationHostingAndDelivery")}</td>
            <td>{t("legal.subprocessors.requestDataAndLogsInTransit")}</td>
            <td>{t("legal.subprocessors.unitedStatesGlobalEdge")}</td>
          </tr>
          <tr>
            <td>{t("legal.subprocessors.dodoPayments")}</td>
            <td>
              {t("legal.subprocessors.subscriptionBillingAndTheOnetimeFoundingseatCheckoutMerc")}
            </td>
            <td>
              {t("legal.subprocessors.yourNameEmailAndBillingDetailsAtCheckoutAndThePaymentRec")}
            </td>
            <td>{t("legal.subprocessors.unitedStatesIndia")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.resend")}</td>
            <td>{t("legal.privacy.transactionalEmailDelivery")}</td>
            <td>
              {t("legal.subprocessors.yourEmailAddressAndTheContentOfTheBriefOrNoticeBeingDeli")}
            </td>
            <td>{t("legal.subprocessors.unitedStates")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.cronAndJobInfrastructure")}</td>
            <td>{t("legal.subprocessors.schedulingOfBriefsAndBackgroundJobs")}</td>
            <td>{t("legal.subprocessors.jobPayloadsWhichMayIncludeWorkspaceIdentifiers")}</td>
            <td>{t("legal.subprocessors.unitedStates")}</td>
          </tr>
        </tbody>
      </table>

      <h2>{t("legal.subprocessors.aiClientsYouConnect")}</h2>
      <p>
        {t("legal.subprocessors.anthropicClaudeOpenaiCodexCursorAntigravityOpencodeAndOt")} <strong>{t("legal.privacy.not")}</strong> {t("legal.subprocessors.ourProcessorsTheyAreIndependentControllersActingForYouSo")}{" "}
        <a href="/data-and-ai">{t("legal.dataAndAi")}</a>.
      </p>

      <h2>{t("legal.subprocessors.selfhostedSophionosCore")}</h2>
      <p>
        {t("legal.subprocessors.ifYouSelfhost")} <strong>{t("legal.subprocessors.you")}</strong> {t("legal.subprocessors.chooseTheProcessorsThisPageListsOurChoicesNotYoursASelfh")}
      </p>
      <ul>
        <li>
          <strong>{t("legal.subprocessors.yourOwnClerkApplication")}</strong> {t("legal.subprocessors.orYourIdentityProviderOfChoiceForAuthentication")}
        </li>
        <li>
          <strong>{t("legal.subprocessors.yourOwnSupabasepostgresInstance")}</strong> {t("legal.subprocessors.andYourOwnHostingInWhateverRegionYouConfigure")}
        </li>
        <li>
          <strong>{t("legal.subprocessors.yourOwnEmailProvider")}</strong> {t("legal.subprocessors.ifYouEnableBriefs")}
        </li>
        <li>
          <strong>{t("legal.subprocessors.anyAiClientYourUsersConnect")}</strong>
        </li>
      </ul>
      <p>
        {t("legal.subprocessors.billingDodoPaymentsAndTheSophionosmanagedSupabaseAndVerc")}
      </p>

      <h2>{t("legal.subprocessors.changesToThisList")}</h2>
      <p>
        {t("legal.subprocessors.weAddAVendorOnlyWhenAFeatureNeedsItAndWeUpdateThisPageAt")}{" "}
        <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a>.
      </p>
      <p className="text-sm text-muted-foreground">
        {t("legal.security.thisPageIsProductDocumentationNotLegalCounsel")}
      </p>
      <p>
        {t("legal.privacy.related")} <a href="/privacy">{t("legal.privacy")}</a> ·{" "}
        <a href="/security">{t("legal.security")}</a> · <a href="/terms">{t("legal.terms")}</a>
      </p>
    </TrustPage>
  );
}
