import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { FileTextIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Terms & Conditions | SophionOS",
  description:
    "The terms that govern use of the SophionOS platform: the service, accounts, plans and limits, founding seats, acceptable use, API and MCP access, your content, billing, disputes, and governing law.",
};

export default async function TermsPage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={FileTextIcon}
      title={t("chrome.termsAndPolicies")}
      description={t("legal.terms.theTermsThatGovernUseOfTheSophionosPlatformTheServiceAcc")}
    >
      <PolicyMeta
        version="3.0"
        effective="October 19, 2026"
        summary={t("legal.terms.adoptsTheReviewedAndCorrectedSophionosTermsConditionsV2E")}
      />
      <p className="text-sm text-muted-foreground">
        <strong>{t("legal.privacy.draftNotYetInForce")}</strong> {t("legal.terms.thisDocumentIsProductTextAwaitingReviewByQualifiedIndian")}
      </p>

      <h2>{t("legal.terms.termsConditionsOfUse")}</h2>

      <p>
        {t("legal.terms.theseTermsGovernYourAccessToAndUseOfTheSophionosPlatform")} <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a> {t("legal.terms.andOurMarketingCommunicationsPolicyEachIsConsentedToInde")}
      </p>

      <h2>{t("legal.terms.n1TheService")}</h2>
      <p>
        {t("legal.terms.sophionosIsALifeOperatingSystemAndSystemOfRecordForInter")}
      </p>
      <p>
        {t("legal.terms.inTheseTermsSophionosWeUsMeansTahaAalamASoleProprietorTr")}
      </p>
      <p>
        {t("legal.terms.theseTermsGovernYourUseOfTheServiceTheyAreNotTheContract")}{" "}
        <strong>{t("legal.privacy.merchantOfRecord")}</strong>{t("legal.terms.dodoPaymentsTakesYourPaymentIssuesTheInvoiceAppliesAndRe")}
      </p>
      <p>
        {t("legal.terms.sophionosIsProvided")} <strong>{t("legal.terms.asIs")}</strong>{t("legal.terms.weDoNotWarrantThatTheServiceWillBeUninterruptedErrorfree")}
      </p>
      <p>
        {t("legal.terms.theServiceIsUnderActiveDevelopmentExpectRoughEdgesSchema")}
        <code>{t("legal.terms.apiv1")}</code>{t("legal.terms.andTheMcpServerAre")}{" "}
        <strong>{t("legal.terms.experimental")}</strong>{t("legal.terms.interfacesMayChangeAndTheyAreNotSoldAsAStableMultitenant")}{" "}
        <a href="/security">{t("legal.security")}</a> {t("legal.privacy.and")}{" "}
        <a href="/data-and-ai">{t("legal.dataAndAi")}</a> {t("legal.terms.forWhatIsAndIsNotClaimed")}
      </p>
      <p>
        {t("legal.terms.weMayModifySuspendOrDiscontinueFeaturesWhereAChangeMater")}
      </p>

      <h2>{t("legal.terms.n2AccountsAndEligibility")}</h2>
      <p>
        {t("legal.terms.youMustBe")} <strong>{t("legal.terms.atLeast18YearsOld")}</strong> {t("legal.terms.toHoldAnAccountByCreatingAnAccountAndAcceptingTheseTerms")}{" "}
        <a href="/privacy">{t("legal.terms.childrensDataSection")}</a> {t("legal.terms.ofThePrivacyPolicy")}
      </p>
      <p>{t("legal.terms.youAreResponsibleFor")}</p>
      <ul>
        <li>{t("legal.terms.providingAccurateRegistrationDetailsAndKeepingThemCurren")}</li>
        <li>
          {t("legal.terms.keepingYourCredentialsConfidentialAndNotifyingUsAtOnceIf")}
        </li>
        <li>
          {t("legal.terms.allActivityThatHappensUnderYourAccountIncludingActivityB")}
        </li>
      </ul>
      <p>
        {t("legal.terms.keepOnePersonToOneAccountAndDoNotShareAnAccountBetweenMu")}
      </p>
      <p>
        {t("legal.terms.weMaySuspendOrTerminateAnAccountThatBreachesTheseTermsTh")}
      </p>

      <h2>{t("legal.terms.n3PlansTiersAndTechnicalLimits")}</h2>
      <p>
        {t("legal.terms.theServiceIsOfferedOnThePlansBelowPricesAreInUsDollarsAn")}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("legal.terms.plan")}</th>
            <th>{t("legal.terms.price")}</th>
            <th>{t("legal.terms.whatYouGet")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{t("legal.terms.free")}</strong>
            </td>
            <td>{t("legal.terms.n0Forever")}</td>
            <td>
              {t("legal.terms.theManagedPersonalWorkspaceWithA100entityCapAreasGoalsPr")}
            </td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.terms.pro")}</strong>
            </td>
            <td>{t("legal.terms.n15month")}</td>
            <td>
              {t("legal.terms.unlimitedEntitiesRestApiAndMcpAccessWithPerkeyExpiryLabe")}
            </td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.terms.power")}</strong>
            </td>
            <td>{t("legal.terms.n30month")}</td>
            <td>
              {t("legal.terms.everythingInProPlusAdvancedAiPoliciesApprovalWorkflowsFo")}
            </td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.terms.business")}</strong>
            </td>
            <td>{t("legal.terms.contactSales")}</td>
            <td>
              {t("legal.terms.governedCompanyContextAndCompanyBrainOrganizationWorkspa")}
            </td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>
          <strong>{t("legal.terms.rateLimitsArePerMinuteAndEnforcedPerPlan")}</strong> {t("legal.terms.theAuthoritativeNumbersArePublishedInTheAppUnderSettings")}
        </li>
        <li>
          <strong>
            {t("legal.terms.mcpAndApiRoutesThatRequireAPaidPlanReturn403ForFreeKeys")}
          </strong>{" "}
          {t("legal.terms.billingSurfacesAppearInSettingsBillingOnlyWhenBillingIsE")}
        </li>
        <li>
          <strong>
            {t("legal.terms.aMissingOrInactiveSubscriptionResolvesToFree")}
          </strong>{" "}
          {t("legal.terms.failclosed")}
        </li>
        <li>
          <strong>
            {t("legal.terms.selfhostedSophionosCoreHasNoSophionosPlansCapsOrBilling")}
          </strong>{" "}
          {t("legal.terms.youRunItAndYouSetItsLimitsSection13")}
        </li>
        <li>
          {t("legal.terms.somePowerFeaturesReachFoundingMembersFirstAsTheyShipWher")}
        </li>
      </ul>
      <p>
        {t("legal.terms.weMayChangeATiersLimitsWeWillNotReduceAPaidTiersFunction")}
      </p>

      <h2>{t("legal.terms.n4FoundingCohortSeats")}</h2>
      <p>
        {t("legal.terms.theFoundingCohortIsLimitedTo100SeatsASeatIsAOnetimePayme")}{" "}
        <strong>{t("legal.terms.twoYearsOfPower")}</strong> {t("legal.terms.fromTheMomentPaymentIsConfirmedItIsNotASubscriptionAndDo")}
      </p>
      <ul>
        <li>
          <strong>{t("legal.terms.aSeatIsReservedWhenPaymentIsConfirmed")}</strong> {t("legal.terms.ifYouStartCheckoutAndDoNotFinishItYourClaimStaysOnThePen")}
        </li>
        <li>
          <strong>{t("legal.terms.noRecurringCharge")}</strong> {t("legal.terms.whenTheIncludedPeriodEndsTheAccountResolvesToThePlanThat")}
        </li>
        <li>
          <strong>{t("legal.terms.refunds")}</strong> {t("legal.terms.fullRefundOnRequestWithin14DaysOfPaymentByReplyingToAnyE")}{" "}
          <strong>{t("legal.terms.disputessophionoscom")}</strong>{t("legal.terms.dodoPaymentsIsTheMerchantOfRecordAndHoldsYourPaymentSoTh")}
        </li>
      </ul>

      <h2>{t("legal.terms.n5AcceptableUse")}</h2>
      <p>{t("legal.terms.youAgreeNotTo")}</p>
      <ul>
        <li>
          {t("legal.terms.useTheServiceToStoreOrDistributeContentThatIsUnlawfulTha")}
        </li>
        <li>
          {t("legal.terms.attemptToGainAccessToAnotherPersonsAccountDataOrCredenti")}
        </li>
        <li>
          {t("legal.terms.probeScanOrTestTheVulnerabilityOfTheServiceExceptUnderOu")}{" "}
          <a href="/responsible-disclosure">{t("legal.terms.responsibleDisclosureProgramme")}</a>;
        </li>
        <li>
          {t("legal.terms.interfereWithTheServicesOperationIncludingByOverloadingI")}
        </li>
        <li>
          {t("legal.terms.resellSublicenseOrProvideTheServiceToThirdPartiesAsAComp")}
        </li>
        <li>
          {t("legal.terms.useTheServiceToSendUnsolicitedCommercialCommunicationsOr")}
        </li>
        <li>
          {t("legal.terms.misrepresentYourIdentityOrYourAffiliationWhenRaisingAGri")}
        </li>
      </ul>

      <h2>{t("legal.terms.n6ApiKeysMcpAndAiClients")}</h2>
      <p>
        {t("legal.terms.theServiceCanExposeItsDataToExternalClientsThroughApiKey")}
      </p>
      <ul>
        <li>{t("legal.terms.itMayReadAndWriteTheDataYourKeyAuthorises")}</li>
        <li>
          {t("legal.terms.theModelProviderThatClientUsesProcessesWhateverThatClien")}
        </li>
        <li>
          {t("legal.terms.youCanRevokeAKeyAtAnyTimeFromSettingsAndRevocationTakesE")}
        </li>
      </ul>
      <p>
        {t("legal.terms.onceAClientIsConnectedYouAndTheClientAreResponsibleForWh")} <a href="/data-and-ai">{t("legal.dataAndAi")}</a>.
      </p>
      <p>
        {t("legal.terms.theApiAndMcpSurfacesAreExperimentalIfYouImportUntrustedC")}
      </p>
      <p>
        {t("legal.terms.anAiClientYouConnectOperatesOnlyForTheDataPurposesDescri")}{" "}
        <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a>{t("legal.terms.section34ConnectingItIsYourDecisionMadeWithAKeyYouCreate")}
      </p>

      <h2>{t("legal.terms.n7YourContent")}</h2>
      <p>
        {t("legal.terms.youKeepAllOwnershipOfTheContentYouPutInTheServiceWeClaim")}
      </p>
      <p>
        {t("legal.terms.youGrantUsOnlyTheNarrowLicenceNeededToOperateTheServiceT")}{" "}
        <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a>{t("legal.terms.weDoNotUseYourContentToTrainModelsWeDoNotSellYourContent")}
      </p>
      <p>
        {t("legal.terms.youAreResponsibleForHavingTheRightsAndPermissionsNecessa")}
      </p>

      <h2>{t("legal.terms.n8Feedback")}</h2>
      <p>
        {t("legal.terms.ifYouSendUsFeedbackSuggestionsOrIdeasYouGrantUsAPerpetua")}
      </p>

      <h2>{t("legal.terms.n9SuspensionAndTermination")}</h2>
      <p>
        {t("legal.terms.youMayStopUsingTheServiceAndDeleteYourAccountAtAnyTimeFr")}{" "}
        <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a>.
      </p>
      <p>{t("legal.terms.onTermination")}</p>
      <ul>
        <li>{t("legal.terms.yourAccessEndsImmediately")}</li>
        <li>
          {t("legal.terms.yourDataIsHandledAsSetOutInThePrivacyPolicysRetentionAnd")}
        </li>
        <li>
          {t("legal.terms.sectionsThatByTheirNatureShouldSurviveTerminationSurvive")}
        </li>
      </ul>

      <h2>{t("legal.terms.n10IntellectualProperty")}</h2>
      <p>
        {t("legal.terms.sophionosItsNameInterfaceDesignAndUnderlyingSoftwareAreO")}
      </p>
      <p>
        {t("legal.terms.theSophionosCoreSoftwareIsLicensedUnderAgpl30orlaterThat")}
      </p>
      <p>
        {t("legal.terms.sophionosNamesLogosAndTradeDressAreNotLicensedUnderTheAg")}
      </p>

      <h2>{t("legal.terms.n11BillingAndPayment")}</h2>
      <p>
        {t("legal.terms.paidPlansAndFoundingCohortSeatsAreSoldByDodoPaymentsAsOu")}
      </p>
      <p>{t("legal.terms.ifYouSubscribeToAPaidTier")}</p>
      <ul>
        <li>
          {t("legal.terms.feesAreStatedInTheApplicableOrderAndAreChargedInAdvance")}
        </li>
        <li>
          {t("legal.terms.subscriptionsRenewAutomaticallyUntilCancelledAtTheThencu")}
        </li>
        <li>
          {t("legal.terms.youCanCancelAtAnyTimeFromSettingsBillingWhichOpensDodoPa")}
        </li>
        <li>
          {t("legal.terms.invoicesAndLegallyRequiredRecordsAreRetainedAfterCancell")}
        </li>
        <li>
          {t("legal.terms.ifPaymentFailsAndIsNotResolvedWithinTheGracePeriodShownI")}
        </li>
        <li>
          {t("legal.terms.pricesAreExclusiveOfApplicableTaxesWhichDodoPaymentsColl")}
        </li>
      </ul>
      <p>
        <strong>{t("legal.terms.chargedInError")}</strong> {t("legal.terms.ifYouAreChargedInErrorIncludingBeingChargedTwiceForTheSa")}{" "}
        <strong>{t("legal.terms.disputessophionoscom")}</strong> {t("legal.terms.within60DaysOfTheChargeAndWeWillRefundTheErroneousCharge")}
      </p>
      <p>
        {t("legal.terms.disputesAboutAChargeMustBeRaisedWithin60DaysOfTheChargeD")}
      </p>
      <p>
        <strong>
          {t("legal.terms.consumersInTheEuUkAndSimilarJurisdictions")}
        </strong>{" "}
        {t("legal.terms.whereA14dayRightOfWithdrawalAppliesToADigitalSubscriptio")}
      </p>

      <h2>{t("legal.terms.n12ThirdpartyServices")}</h2>
      <p>
        {t("legal.terms.theServiceIntegratesWithThirdPartiesIncludingAnIdentityP")} <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a> {t("legal.terms.andInOur")}{" "}
        <a href="/subprocessors">{t("legal.terms.subprocessorsList")}</a>{t("legal.terms.weAreNotResponsibleForTheContentOrPracticesOfThirdpartyS")}
      </p>
      <p>
        {t("legal.terms.dodoPaymentsIsNotInThatListBecauseItIsNotAServiceWeInteg")}
      </p>

      <h2>{t("legal.terms.n13SelfhostedSophionosCoreVsSophionosCloud")}</h2>
      <p>
        {t("legal.terms.theseTermsGovernYourUseOfSophionosCloudTheUnderlyingCode")}
      </p>

      <h2>{t("legal.terms.n14Disclaimers")}</h2>
      <p>
        {t("legal.terms.toTheMaximumExtentPermittedByLawWeDisclaimAllWarrantiesE")}
      </p>
      <p>
        {t("legal.terms.thereHasBeenNoFormalThirdpartySecurityAuditOfThisCodebas")}
      </p>

      <h2>{t("legal.terms.n15LimitationOfLiability")}</h2>
      <p>
        {t("legal.terms.toTheMaximumExtentPermittedByLawWeAreNotLiableForIndirec")}
      </p>
      <p>
        {t("legal.terms.nothingInTheseTermsExcludesLiabilityThatCannotLawfullyBe")}
      </p>

      <h2>{t("legal.terms.n16Indemnity")}</h2>
      <p>
        {t("legal.terms.youAgreeToDefendAndIndemnifySophionosAndItsContributorsA")}
      </p>

      <h2>{t("legal.terms.n17DisputeResolutionAndArbitration")}</h2>
      <p>
        <strong>
          {t("legal.terms.pleaseReadThisSectionCarefullyItAffectsYourLegalRightsIn")}
        </strong>
      </p>
      <ul>
        <li>
          <strong>{t("legal.terms.tryToResolveItFirst")}</strong> {t("legal.terms.beforeStartingArbitrationWriteTo")} <strong>{t("legal.terms.founderssophionoscom")}</strong> {t("legal.terms.withADescriptionOfTheDisputeAndTheReliefYouWantWeWillDoT")}
        </li>
        <li>
          <strong>{t("legal.terms.agreementToArbitrate")}</strong> {t("legal.terms.exceptAsStatedBelowYouAndSophionosAgreeToResolveEveryDis")}
        </li>
        <li>
          <strong>{t("legal.terms.exceptions")}</strong> {t("legal.terms.eitherOfUsMayBringAnIndividualClaimInSmallclaimsCourtIfI")}
        </li>
        <li>
          <strong>{t("legal.terms.purchaseDisputesAreNotOurs")}</strong> {t("legal.terms.exceptForABillingErrorOrDuplicateChargeWhichIsHandledUnd")}
        </li>
        <li>
          <strong>{t("legal.terms.yourStatutoryRightsAreUnaffected")}</strong> {t("legal.terms.nothingInThisSectionPreventsYouFromBringingAMatterToACon")}
        </li>
        <li>
          <strong>{t("legal.terms.waiverOfClassActions")}</strong> {t("legal.terms.allDisputesMustBeBroughtOnAnIndividualBasisNeitherYouNor")}
        </li>
        <li>
          <strong>{t("legal.terms.waiverOfJuryTrial")}</strong> {t("legal.terms.byAgreeingToArbitrationYouAndSophionosWaiveTheRightToATr")}
        </li>
        <li>
          <strong>{t("legal.terms.optOut")}</strong> {t("legal.terms.youMayOptOutOfThisArbitrationAgreementWithin30DaysOfFirs")}{" "}
          <strong>{t("legal.terms.founderssophionoscom")}</strong> {t("legal.terms.withTheSubjectLineArbitrationOptoutIfYouOptOutDisputesPr")}
        </li>
      </ul>

      <h2>{t("legal.terms.n18ChangesToTheseTerms")}</h2>
      <p>
        {t("legal.terms.weMayReviseTheseTermsARevisionIsPublishedAsANewVersionAt")}{" "}
        <a href="/terms">{t("legal.terms.theTermsPage")}</a> {t("legal.terms.withItsOwnVersionNumberAndEffectiveDate")}
      </p>
      <p>
        {t("legal.terms.whenWePublishAVersionThatChangesTheseTermsMateriallyUser")}
      </p>
      <p>
        {t("legal.terms.continuingToUseTheServiceAfterTheEffectiveDateOfARevised")}
      </p>
      <p>
        {t("legal.terms.ifASignedCloudOrderOrEnterpriseAgreementConflictsWithThi")}
      </p>

      <h2>{t("legal.terms.n19ChildrensData")}</h2>
      <p>
        {t("legal.terms.theServiceIsNotDirectedAtChildrenAndIsNotIntendedForUseB")} <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a> {t("legal.terms.forTheFullStatementAndWhatToDoIfYouBelieveAChildHasUsedT")}
      </p>

      <h2>{t("legal.terms.n20GoverningLawAndGeneral")}</h2>
      <p>
        {t("legal.terms.theseTermsAreGovernedByTheLawsOfIndiaTheCourtsAtBengalur")}
      </p>
      <p>
        {t("legal.terms.thePurchaseOfAPaidPlanOrAFoundingCohortSeatIsASeparateCo")}
      </p>
      <p>
        {t("legal.terms.nothingInTheseTermsLimitsYourRightToApproachTheDataProte")}
      </p>
      <ul>
        <li>
          <strong>{t("legal.terms.export")}</strong> {t("legal.terms.youAgreeNotToExportOrReexportAnythingFromTheServiceInVio")}
        </li>
        <li>
          <strong>{t("legal.terms.assignment")}</strong> {t("legal.terms.youCannotAssignTheseTermsWithoutOurWrittenConsentWeMayAs")}
        </li>
        <li>
          <strong>{t("legal.terms.entireAgreementSeverability")}</strong> {t("legal.terms.theseTermsTogetherWithThePrivacyPolicyAndAnySignedOrderA")}
        </li>
        <li>
          <strong>{t("legal.terms.copyright")}</strong> {t("legal.terms.n2026SophionosAllRightsReserved")}
        </li>
      </ul>

      <h2>{t("legal.terms.n21Contact")}</h2>
      <p>
        {t("legal.terms.questionsAboutTheseTermsAndAboutTheServiceItselfAddresse")}{" "}
        <strong>{t("legal.terms.contactsophionoscom")}</strong>.
      </p>
      <p>
        {t("legal.terms.questionsAboutAPurchaseAChargeAnInvoiceATaxARefundOrCanc")}{" "}
        <strong>{t("legal.terms.disputessophionoscom")}</strong> {t("legal.terms.asSection11SetsOutAndWeWillRefundTheErroneousCharge")}
      </p>
      <p>
        {t("legal.terms.grievancesAboutTheseTermsAreHandledThroughTheProcessAndT")}{" "}
        <a href="/privacy">{t("legal.privacy.privacyPolicy")}</a>.
      </p>

      <p className="text-sm text-muted-foreground">
        <strong>{t("legal.privacy.statusDraft")}</strong> {t("legal.privacy.thisDocumentRequiresReviewByQualifiedIndianCounselBefore")}
      </p>
      <p>
        {t("legal.privacy.related")} <a href="/privacy">{t("legal.privacy")}</a> ·{" "}
        <a href="/security">{t("legal.security")}</a> · <a href="/data-and-ai">{t("legal.dataAndAi")}</a>{" "}
        · <a href="/subprocessors">{t("legal.subprocessors")}</a> ·{" "}
        <a href="/responsible-disclosure">{t("legal.terms.disclosure")}</a>
      </p>
    </TrustPage>
  );
}
