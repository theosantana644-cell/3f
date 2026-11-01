import { Router, type IRouter } from "express";
import healthRouter from "./health";
import deliveryRouter from "./delivery";

const router: IRouter = Router();

router.use(healthRouter);
router.use(deliveryRouter);

export default router;
