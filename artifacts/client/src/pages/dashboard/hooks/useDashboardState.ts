import { 
    useGetCompany, 
    useGetDashboardSummary, 
    useGetMonthlyPnl, 
    useGetRecentActivity 
} from "@workspace/api-client-react";

export function useDashboardState() {
    const { data: company, isLoading: loadingCompany } = useGetCompany();
    const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
    const { data: pnl, isLoading: loadingPnl } = useGetMonthlyPnl();
    const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();

    return {
        company,
        summary,
        pnl,
        activity,
        isLoading: loadingCompany || loadingSummary || loadingPnl || loadingActivity,
        loadingCompany,
        loadingSummary,
    };
}
