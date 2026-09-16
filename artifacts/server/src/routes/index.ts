import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companyRouter from "./company";
import assetsRouter from "./assets";
import transactionsRouter from "./transactions";
import inventoryRouter from "./inventory";
import employeesRouter from "./employees";
import payrollsRouter from "./payrolls";
import dashboardRouter from "./dashboard";
import legalRouter from "./legal";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companyRouter);
router.use(assetsRouter);
router.use(transactionsRouter);
router.use(inventoryRouter);
router.use(employeesRouter);
router.use(payrollsRouter);
router.use(dashboardRouter);
router.use(legalRouter);
router.use(insightsRouter);

export default router;
