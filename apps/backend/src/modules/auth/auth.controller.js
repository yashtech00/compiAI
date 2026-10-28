import { AuthService } from './auth.service.js';
import { signupSchema, signinSchema, updateProfileSchema } from './auth.validation.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../../utils/token.js';
import { successResponse } from '../../utils/response.js';

export class AuthController {
  static async signup(req, res, next) {
    try {
      const validated = signupSchema.parse(req.body);
      const user = await AuthService.signup(validated);

      const token = signToken({ userId: user.id, role: user.role });
      setAuthCookie(res, token);

      return successResponse(res, { user, token }, 'Account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async signin(req, res, next) {
    try {
      const validated = signinSchema.parse(req.body);
      const user = await AuthService.signin(validated);

      const token = signToken({ userId: user.id, role: user.role });
      setAuthCookie(res, token);

      return successResponse(res, { user, token }, 'Signed in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async signout(req, res, next) {
    try {
      clearAuthCookie(res);
      return successResponse(res, null, 'Signed out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.user.id);
      return successResponse(res, { user }, 'Current user retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const profile = await AuthService.updateProfile(req.user.id, validated);
      return successResponse(res, { profile }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
