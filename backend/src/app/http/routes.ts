import type { RouteDefinition } from './HttpRouter.js';
import { GoogleLoginHandler } from '../../features/auth/handlers/GoogleLoginHandler.js';
import { LinkGoogleHandler } from '../../features/auth/handlers/LinkGoogleHandler.js';
import { LoginHandler } from '../../features/auth/handlers/LoginHandler.js';
import { CreateClubActualEntryHandler } from '../../features/club/handlers/CreateClubActualEntryHandler.js';
import { DeleteClubActualEntryHandler } from '../../features/club/handlers/DeleteClubActualEntryHandler.js';
import { ListClubActualAveragesHandler } from '../../features/club/handlers/ListClubActualAveragesHandler.js';
import { ListClubActualEntriesHandler } from '../../features/club/handlers/ListClubActualEntriesHandler.js';
import { ListClubCarryHandler } from '../../features/club/handlers/ListClubCarryHandler.js';
import { SaveClubCarryHandler } from '../../features/club/handlers/SaveClubCarryHandler.js';
import { SyncVirtualCaddyActualsHandler } from '../../features/club/handlers/SyncVirtualCaddyActualsHandler.js';
import { CreateCourseHandler } from '../../features/courses/handlers/CreateCourseHandler.js';
import { GetCourseHandler } from '../../features/courses/handlers/GetCourseHandler.js';
import { ListCoursesHandler } from '../../features/courses/handlers/ListCoursesHandler.js';
import { UpdateCourseHandler } from '../../features/courses/handlers/UpdateCourseHandler.js';
import { CreateRoundHandler } from '../../features/rounds/handlers/CreateRoundHandler.js';
import { DeleteRoundHandler } from '../../features/rounds/handlers/DeleteRoundHandler.js';
import { GetRoundHandler } from '../../features/rounds/handlers/GetRoundHandler.js';
import { ListRoundsHandler } from '../../features/rounds/handlers/ListRoundsHandler.js';
import { UpdateRoundScoreHandler } from '../../features/rounds/handlers/UpdateRoundScoreHandler.js';
import { UpdateRoundHandler } from '../../features/rounds/handlers/UpdateRoundHandler.js';
import { DebugDbHandler } from '../../features/system/handlers/DebugDbHandler.js';
import { HealthHandler } from '../../features/system/handlers/HealthHandler.js';
import { GetMeHandler } from '../../features/users/handlers/GetMeHandler.js';
import { PublicSignupDisabledHandler } from '../../features/users/handlers/PublicSignupDisabledHandler.js';
import { CreateWedgeEntryHandler } from '../../features/wedge/handlers/CreateWedgeEntryHandler.js';
import { CreateWedgeMatrixHandler } from '../../features/wedge/handlers/CreateWedgeMatrixHandler.js';
import { DeleteWedgeEntryHandler } from '../../features/wedge/handlers/DeleteWedgeEntryHandler.js';
import { DeleteWedgeMatrixHandler } from '../../features/wedge/handlers/DeleteWedgeMatrixHandler.js';
import { ListWedgeEntriesHandler } from '../../features/wedge/handlers/ListWedgeEntriesHandler.js';
import { ListWedgeMatricesHandler } from '../../features/wedge/handlers/ListWedgeMatricesHandler.js';
import { UpdateWedgeEntryHandler } from '../../features/wedge/handlers/UpdateWedgeEntryHandler.js';
import { UpdateWedgeMatrixHandler } from '../../features/wedge/handlers/UpdateWedgeMatrixHandler.js';

export const routes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/health',
    handler: HealthHandler,
  },
  {
    method: 'POST',
    path: '/api/users',
    ensureSchema: true,
    handler: PublicSignupDisabledHandler,
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    ensureSchema: true,
    handler: LoginHandler,
  },
  {
    method: 'POST',
    path: '/api/auth/google',
    ensureSchema: true,
    handler: GoogleLoginHandler,
  },
  {
    method: 'GET',
    path: '/api/me',
    requiresAuth: true,
    ensureSchema: true,
    handler: GetMeHandler,
  },
  {
    method: 'POST',
    path: '/api/me/google-link',
    requiresAuth: true,
    ensureSchema: true,
    handler: LinkGoogleHandler,
  },
  {
    method: 'GET',
    path: '/api/debug/db',
    requiresAuth: true,
    ensureSchema: true,
    handler: DebugDbHandler,
  },
  {
    method: 'GET',
    path: '/api/courses',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListCoursesHandler,
  },
  {
    method: 'POST',
    path: '/api/courses',
    requiresAuth: true,
    ensureSchema: true,
    handler: CreateCourseHandler,
  },
  {
    method: 'GET',
    path: /^\/api\/courses\/([^/]+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: GetCourseHandler,
  },
  {
    method: 'PUT',
    path: /^\/api\/courses\/([^/]+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: UpdateCourseHandler,
  },
  {
    method: 'GET',
    path: '/api/rounds',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListRoundsHandler,
  },
  {
    method: 'POST',
    path: '/api/rounds',
    requiresAuth: true,
    ensureSchema: true,
    handler: CreateRoundHandler,
  },
  {
    method: 'GET',
    path: /^\/api\/rounds\/([^/]+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: GetRoundHandler,
  },
  {
    method: 'PUT',
    path: /^\/api\/rounds\/([^/]+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: UpdateRoundHandler,
  },
  {
    method: 'POST',
    path: '/api/rounds.updateScore',
    requiresAuth: true,
    ensureSchema: true,
    handler: UpdateRoundScoreHandler,
  },
  {
    method: 'DELETE',
    path: /^\/api\/rounds\/([^/]+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: DeleteRoundHandler,
  },
  {
    method: 'GET',
    path: '/api/club-carry',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListClubCarryHandler,
  },
  {
    method: 'PUT',
    path: '/api/club-carry',
    requiresAuth: true,
    ensureSchema: true,
    handler: SaveClubCarryHandler,
  },
  {
    method: 'GET',
    path: '/api/club-actuals/entries',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListClubActualEntriesHandler,
  },
  {
    method: 'POST',
    path: '/api/club-actuals/virtual-caddy-sync',
    requiresAuth: true,
    ensureSchema: true,
    handler: SyncVirtualCaddyActualsHandler,
  },
  {
    method: 'DELETE',
    path: /^\/api\/club-actuals\/entries\/(\d+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: DeleteClubActualEntryHandler,
  },
  {
    method: 'GET',
    path: '/api/club-actuals',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListClubActualAveragesHandler,
  },
  {
    method: 'POST',
    path: '/api/club-actuals',
    requiresAuth: true,
    ensureSchema: true,
    handler: CreateClubActualEntryHandler,
  },
  {
    method: 'GET',
    path: '/api/wedge-matrices',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListWedgeMatricesHandler,
  },
  {
    method: 'POST',
    path: '/api/wedge-matrices',
    requiresAuth: true,
    ensureSchema: true,
    handler: CreateWedgeMatrixHandler,
  },
  {
    method: 'PUT',
    path: /^\/api\/wedge-matrices\/(\d+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: UpdateWedgeMatrixHandler,
  },
  {
    method: 'DELETE',
    path: /^\/api\/wedge-matrices\/(\d+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: DeleteWedgeMatrixHandler,
  },
  {
    method: 'GET',
    path: '/api/wedge-entries',
    requiresAuth: true,
    ensureSchema: true,
    handler: ListWedgeEntriesHandler,
  },
  {
    method: 'POST',
    path: '/api/wedge-entries',
    requiresAuth: true,
    ensureSchema: true,
    handler: CreateWedgeEntryHandler,
  },
  {
    method: 'PUT',
    path: /^\/api\/wedge-entries\/(\d+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: UpdateWedgeEntryHandler,
  },
  {
    method: 'DELETE',
    path: /^\/api\/wedge-entries\/(\d+)$/,
    requiresAuth: true,
    ensureSchema: true,
    handler: DeleteWedgeEntryHandler,
  },
];
