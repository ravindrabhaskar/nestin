import { Router } from 'express';
import * as ops from '../services/operationsService.js';
import {
  authenticate,
  requireRole,
  requirePermission,
  ownerScope,
  currentUser,
  type AuthedRequest,
} from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';
import { badRequest } from '../lib/errors.js';

/**
 * Owner operations: expenses & P&L, utility billing, task board, occupancy forecast, property
 * comparison and CSV import. Same tenancy rules as the CRM.
 */
export const operationsRouter = Router();

const ctx = (req: AuthedRequest) => ({ correlationId: req.correlationId });
const q = (val: unknown) => (typeof val === 'string' && val ? val : undefined);

operationsRouter.use(authenticate, requireRole('owner', 'employee', 'super_admin'));

// Expenses --------------------------------------------------------------------------------------
operationsRouter.get(
  '/expenses',
  requirePermission('reports.view'),
  wrap((req, res) =>
    sendOk(res, {
      categories: ops.EXPENSE_CATEGORIES,
      expenses: ops.listExpenses(ownerScope(req), {
        propertyId: q(req.query.propertyId),
        month: q(req.query.month),
        category: q(req.query.category),
      }),
    })
  )
);
operationsRouter.post(
  '/expenses',
  requirePermission('payments.manage'),
  wrap((req, res) => sendOk(res, ops.addExpense(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201))
);
operationsRouter.put(
  '/expenses/:id',
  requirePermission('payments.manage'),
  wrap((req, res) => sendOk(res, ops.updateExpense(ownerScope(req), req.params.id, req.body || {})))
);
operationsRouter.delete(
  '/expenses/:id',
  requirePermission('payments.manage'),
  wrap((req, res) => sendOk(res, { deleted: ops.deleteExpense(ownerScope(req), req.params.id) }))
);
operationsRouter.get(
  '/pnl',
  requirePermission('reports.view'),
  wrap((req, res) => sendOk(res, ops.profitAndLoss(ownerScope(req), q(req.query.month))))
);

// Utilities -------------------------------------------------------------------------------------
operationsRouter.get(
  '/utilities',
  requirePermission('reports.view'),
  wrap((req, res) => sendOk(res, ops.listUtilityReadings(ownerScope(req), q(req.query.propertyId))))
);
operationsRouter.post(
  '/utilities',
  requirePermission('payments.manage'),
  wrap((req, res) =>
    sendOk(res, ops.addUtilityReading(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201)
  )
);
operationsRouter.post(
  '/utilities/:id/bill',
  requirePermission('payments.manage'),
  wrap((req, res) => sendOk(res, ops.billUtilityReading(currentUser(req), ownerScope(req), req.params.id, ctx(req))))
);
operationsRouter.delete(
  '/utilities/:id',
  requirePermission('payments.manage'),
  wrap((req, res) => sendOk(res, { deleted: ops.deleteUtilityReading(ownerScope(req), req.params.id) }))
);

// Tasks -----------------------------------------------------------------------------------------
operationsRouter.get(
  '/tasks',
  wrap((req, res) => {
    const user = currentUser(req);
    const mine = req.query.mine === 'true' || (user.role === 'employee' && !user.permissions?.['customers.edit']);
    sendOk(
      res,
      ops
        .listTasks(ownerScope(req), { status: q(req.query.status) })
        .filter((t) => !mine || t.assigneeUserId === user.id || t.createdByUserId === user.id)
    );
  })
);
operationsRouter.post(
  '/tasks',
  wrap((req, res) => sendOk(res, ops.createTask(currentUser(req), ownerScope(req), req.body || {}, ctx(req)), 201))
);
operationsRouter.put(
  '/tasks/:id',
  wrap((req, res) =>
    sendOk(res, ops.updateTask(currentUser(req), ownerScope(req), req.params.id, req.body || {}, ctx(req)))
  )
);
operationsRouter.delete(
  '/tasks/:id',
  requirePermission('customers.edit'),
  wrap((req, res) => sendOk(res, { deleted: ops.deleteTask(ownerScope(req), req.params.id) }))
);

// Reports ---------------------------------------------------------------------------------------
operationsRouter.get(
  '/forecast',
  requirePermission('reports.view'),
  wrap((req, res) => sendOk(res, ops.occupancyForecast(ownerScope(req))))
);
operationsRouter.get(
  '/comparison',
  requirePermission('reports.view'),
  wrap((req, res) => sendOk(res, ops.propertyComparison(ownerScope(req))))
);

// Import ----------------------------------------------------------------------------------------
operationsRouter.get('/import/residents/template', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nestin-residents-template.csv"');
  res.send(ops.importTemplateCsv());
});
operationsRouter.post(
  '/import/residents',
  requirePermission('customers.edit'),
  wrap((req, res) => {
    const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
    if (!csv) throw badRequest('Send the CSV text as { "csv": "..." }');
    sendOk(res, ops.importResidentsCsv(currentUser(req), ownerScope(req), csv, ctx(req)), 201);
  })
);
