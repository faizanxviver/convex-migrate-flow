import { query } from "./_generated/server";
import { getSettings } from "./helpers";

/** Public site settings (mirror of settings_read policy). */
export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    if (!settings) return null;
    return {
      siteName: settings.siteName,
      siteTitle: settings.siteTitle,
      siteLogo: settings.siteLogo,
      siteFavicon: settings.siteFavicon,
      seoDescription: settings.seoDescription,
      seoKeywords: settings.seoKeywords,
      supportWhatsapp: settings.supportWhatsapp,
      minDeposit: settings.minDeposit,
      minWithdraw: settings.minWithdraw,
      quickAmounts: settings.quickAmounts,
      announcementText: settings.announcementText,
      announcementActive: settings.announcementActive,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      salaryTiers: settings.salaryTiers,
      rewardAmount: settings.rewardAmount,
      rewardCooldownHours: settings.rewardCooldownHours,
      rewardActive: settings.rewardActive,
      proofRewardAmount: settings.proofRewardAmount,
      showProofsSection: settings.showProofsSection,
      withdrawOpenHour: settings.withdrawOpenHour,
      withdrawCloseHour: settings.withdrawCloseHour,
      levels: settings.levels,
    };
  },
});
