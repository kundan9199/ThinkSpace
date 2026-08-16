"use server";

import { createSupabaseServerClient } from "./supabase-server";
import { prisma } from "@/lib/db/prisma";
import {
  validateSignupInput,
  validateLoginInput,
  type SignupInput,
  type LoginInput,
} from "@/lib/validation/auth";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

/**
 * Server Action: Registers a new user with Supabase Auth
 * and creates a corresponding application user profile in PostgreSQL.
 */
export async function signUpAction(
  input: SignupInput
): Promise<AuthActionResult> {
  const validation = validateSignupInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      error: "Please fix the errors in the form.",
      fieldErrors: validation.errors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create account.",
      };
    }

    if (data.user) {
      // Sync user profile with Prisma PostgreSQL database
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            name: input.name,
            email: data.user.email || input.email,
          },
          create: {
            id: data.user.id,
            email: data.user.email || input.email,
            name: input.name,
          },
        });
      } catch (dbError) {
        console.error("Failed to sync user to database:", dbError);
        // Note: Supabase auth user is created; database sync failure logged gracefully
      }
    }

    return {
      success: true,
      message:
        data.session === null
          ? "Account created! Please check your email for confirmation."
          : "Account created successfully!",
    };
  } catch (err: unknown) {
    console.error("SignUp error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during signup. Please try again.",
    };
  }
}

/**
 * Server Action: Authenticates a user with email and password.
 */
export async function loginAction(
  input: LoginInput
): Promise<AuthActionResult> {
  const validation = validateLoginInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      error: "Please fix the errors in the form.",
      fieldErrors: validation.errors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      let friendlyError = error.message;
      if (error.message.includes("Invalid login credentials")) {
        friendlyError = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
        friendlyError = "Please confirm your email address before logging in.";
      }

      return {
        success: false,
        error: friendlyError,
      };
    }

    if (data.user) {
      // Ensure user profile exists in Prisma PostgreSQL
      try {
        const userName =
          data.user.user_metadata?.name ||
          data.user.email?.split("@")[0] ||
          "Whiteboard User";

        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            email: data.user.email || input.email,
          },
          create: {
            id: data.user.id,
            email: data.user.email || input.email,
            name: userName,
          },
        });
      } catch (dbError) {
        console.error("Failed to sync user profile on login:", dbError);
      }
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    console.error("Login error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
    };
  }
}

/**
 * Server Action: Signs out the current user session.
 */
export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    console.error("Logout error:", err);
    return {
      success: false,
      error: "Failed to sign out.",
    };
  }
}

/**
 * Gets the current authenticated user and profile server-side.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch application-level profile from database
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return {
      id: user.id,
      email: user.email || "",
      name:
        profile?.name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User",
      avatarUrl: profile?.avatarUrl || null,
      createdAt: profile?.createdAt || new Date(),
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
