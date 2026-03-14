'use server';

import { revalidatePath } from 'next/cache';
import userService, {
  CreateUserInput,
  AdminUpdateUserInput,
} from '@/services/api/userService';

export type ActionState<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

// ✅ Create Admin Action
export async function createAdminAction(
  formData: CreateUserInput,
): Promise<ActionState> {
  try {
    const phoneNumber = formData.phone_number?.trim();
    const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

    const profile = await userService.createProfile({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      role: 'admin',
      ...(hasPhoneNumber && { phone_number: phoneNumber }),
      ...(formData.avatar_url && { avatar_url: formData.avatar_url }),
    });

    revalidatePath('/admin');
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin',
    };
  }
}

// ✅ Update Admin Action
export async function updateAdminAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<ActionState> {
  try {
    const profile = await userService.adminUpdateProfile(id, changes);
    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin',
    };
  }
}

// ✅ Delete Admin Action
export async function deleteAdminAction(id: string): Promise<ActionState> {
  try {
    await userService.deleteProfile(id);
    revalidatePath('/admin');
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete admin',
    };
  }
}

// ✅ Update Admin Status Action
export async function updateAdminStatusAction(
  id: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<ActionState> {
  try {
    const profile = await userService.adminUpdateProfile(id, { status });
    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update admin status',
    };
  }
}

// ✅ Create Consumer Action
export async function createConsumerAction(
  formData: CreateUserInput,
): Promise<ActionState> {
  try {
    const phoneNumber = formData.phone_number?.trim();
    const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

    const profile = await userService.createProfile({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      role: 'user',
      ...(hasPhoneNumber && { phone_number: phoneNumber }),
      ...(formData.avatar_url && { avatar_url: formData.avatar_url }),
    });

    revalidatePath('/admin');
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create consumer',
    };
  }
}

// ✅ Update Consumer Action
export async function updateConsumerAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<ActionState> {
  try {
    const profile = await userService.adminUpdateProfile(id, changes);
    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update consumer',
    };
  }
}

// ✅ Delete Consumer Action
export async function deleteConsumerAction(id: string): Promise<ActionState> {
  try {
    await userService.deleteProfile(id);
    revalidatePath('/admin');
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete consumer',
    };
  }
}

// ✅ Create Business Owner Action
export async function createBusinessOwnerAction(
  formData: CreateUserInput,
): Promise<ActionState> {
  try {
    const phoneNumber = formData.phone_number?.trim();
    const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

    const profile = await userService.createProfile({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      role: 'business_owner',
      ...(hasPhoneNumber && { phone_number: phoneNumber }),
      ...(formData.avatar_url && { avatar_url: formData.avatar_url }),
    });

    revalidatePath('/admin');
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create business owner',
    };
  }
}

// ✅ Update Business Owner Action
export async function updateBusinessOwnerAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<ActionState> {
  try {
    const profile = await userService.adminUpdateProfile(id, changes);
    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update business owner',
    };
  }
}

// ✅ Delete Business Owner Action
export async function deleteBusinessOwnerAction(
  id: string,
): Promise<ActionState> {
  try {
    await userService.deleteProfile(id);
    revalidatePath('/admin');
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete business owner',
    };
  }
}
