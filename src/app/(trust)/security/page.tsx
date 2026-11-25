import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { ShieldCheckIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Security | SophionOS",
  description: "Practical overview of how SophionOS protects user data.",
};

export default async function SecurityPage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={ShieldCheckIcon}
      title={t("legal.security")}
      description={t("legal.security.howSophionosProtectsYourData")}
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary={t("legal.security.replacesThePreviousSecurityPageAddsTheMinimumSafeguardsR")}
      />

      <h2>{t("legal.security.whatWeDo")}</h2>
      <ul>
        <li>
          <strong>{t("legal.security.accountSecurity")}</strong>{t("legal.security.authenticationAndSessionsAreHandledByClerkIncludingSessi")}
        </li>
        <li>
          <strong>{t("legal.security.peruserIsolation")}</strong>{t("legal.security.postgresRowlevelSecurityEnforcesThatASessionSeesOnlyItsO")} <code>{t("legal.security.free")}</code>.
        </li>
        <li>
          <strong>{t("legal.security.encryptionInTransit")}</strong>{t("legal.security.allTrafficIsServedOverTlsAndAPerrequestNoncebasedContent")}
        </li>
        <li>
          <strong>{t("legal.security.encryptionAtRest")}</strong>{t("legal.security.providersideEncryptionOnTheirStorageLayerPlusApplication")}
        </li>
        <li>
          <strong>{t("apiKeyManager.apiKeys")}</strong>{t("legal.security.storedOnlyAsCryptographicHashesShownOnceAtCreationRevoca")}
        </li>
        <li>
          <strong>{t("legal.security.aiControls")}</strong>{t("legal.security.aGlobalAiaccessSwitchASeparateWriteaccessSwitchPerkeyWri")}
        </li>
        <li>
          <strong>{t("legal.security.loggingAndVisibility")}</strong>{t("legal.security.securityAndAccessLogsRetainedForAtLeastOneYearSoThatUnau")}
        </li>
        <li>
          <strong>{t("legal.security.backupsRecovery")}</strong>{t("legal.security.cloudTakesProviderbackedBackupsTheyAreNotZeroknowledgeTh")}
        </li>
        <li>
          <strong>{t("legal.security.operatorAccess")}</strong>{t("legal.security.productionCredentialsAreHeldByTheFounderoperatorAndUsedF")}
        </li>
      </ul>

      <h2>{t("legal.security.indiaMinimumSafeguardsUnderRule6DpdpRules2025")}</h2>
      <p>
        {t("legal.security.whereTheDpdpRules2025ApplyRule6RequiresADataFiduciaryToT")}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("legal.security.rule6Requirement")}</th>
            <th>{t("legal.security.howWeMeetIt")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {t("legal.security.encryptionObfuscationMaskingOrVirtualTokensForPersonalDa")}
            </td>
            <td>
              {t("legal.security.tlsInTransitProvidersideEncryptionAtRestAes256gcmFieldle")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.security.accessControlOnComputerResources")}</td>
            <td>
              {t("legal.security.clerkSessionsRowlevelSecurityServersideEntitlementChecks")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.security.visibilityOnAccessThroughLogsMonitoringAndReview")}</td>
            <td>
              {t("legal.security.accessAndSecurityLoggingRetainedForAtLeastOneYearWithRev")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.security.continuedProcessingIfDataIsLostOrAccessIsDestroyed")}</td>
            <td>{t("legal.security.providerbackedBackupsWithADocumentedRestorePath")}</td>
          </tr>
          <tr>
            <td>{t("legal.security.logAndDataRetentionOfOneYearForDetectionAndRemedy")}</td>
            <td>
              {t("legal.security.logsAreRetainedForAtLeastOneYearUnlessAnotherLawRequires")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.security.contractualSafeguardsWithDataProcessors")}</td>
            <td>
              {t("legal.security.processorsAreBoundToSecurityObligationsInTheirTermsWithU")} <a href="/subprocessors">{t("legal.subprocessors")}</a>.
            </td>
          </tr>
          <tr>
            <td>{t("legal.security.technicalAndOrganisationalMeasuresToEnsureObservance")}</td>
            <td>
              {t("legal.security.thisPageThePrivacyPolicyAndInternalOperatorRunbooksForIn")}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>{t("legal.security.ifSomethingGoesWrong")}</h2>
      <p>
        {t("legal.security.sophionosIsSelfhostedWhoeverOperatesAnInstanceIsResponsi")}
      </p>

      <h2>{t("legal.security.yourPart")}</h2>
      <ul>
        <li>
          {t("legal.security.useAUniquePasswordOnTheIdentityProviderAndTurnOnMultifac")}
        </li>
        <li>
          {t("legal.security.treatAnApiKeyAsYourFullIdentityOnTheApiSurfaceItReachesG")}
        </li>
        <li>
          {t("legal.security.understandThatOnceYouConnectAnAiClientThatClientAndItsPr")}
        </li>
      </ul>

      <h2>{t("legal.security.whatWeDoNotClaim")}</h2>
      <ul>
        <li>
          {t("legal.security.thatWeCannotReadYourDataSophionosCloudHoldsTheEncryption")}
        </li>
        <li>{t("legal.security.militarygradeSecurityOrZeroRisk")}</li>
        <li>
          {t("legal.security.thatExternalAiProvidersNeverReceiveDataAfterYouConnectAC")}
        </li>
        <li>
          {t("legal.security.endtoendEncryptionWeDoNotOfferItAndWeWillNotDescribeTheS")}
        </li>
        <li>
          {t("legal.security.aFormalThirdpartySecurityAuditOrACertificationSuchAsSoc2")}
        </li>
      </ul>

      <p>
        {t("legal.security.reportVulnerabilitiesThrough")}{" "}
        <a href="/responsible-disclosure">{t("legal.security.responsibleDisclosure")}</a>.
      </p>
      <p className="text-sm text-muted-foreground">
        {t("legal.security.thisPageIsProductDocumentationNotLegalCounsel")}
      </p>
      <p>
        {t("legal.privacy.related")} <a href="/privacy">{t("legal.privacy")}</a> · <a href="/terms">{t("legal.terms")}</a> ·{" "}
        <a href="/subprocessors">{t("legal.subprocessors")}</a>
      </p>
    </TrustPage>
  );
}
