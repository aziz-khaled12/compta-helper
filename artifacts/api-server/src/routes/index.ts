import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companyRouter from "./company";
import assetsRouter from "./assets";
import transactionsRouter from "./transactions";
import inventoryRouter from "./inventory";
import employeesRouter from "./employees";
import payrollsRouter from "./payrolls";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companyRouter);
router.use(assetsRouter);
router.use(transactionsRouter);
router.use(inventoryRouter);
router.use(employeesRouter);
router.use(payrollsRouter);
router.use(dashboardRouter);

export default router;
