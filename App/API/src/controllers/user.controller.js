const UserRepository = require('../repositories/user.repository');
const AzureStorageService = require('../services/azure_storage_service');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response.helper');

const user_repository = new UserRepository();
const azure_storage_service = new AzureStorageService();

const user_controller = {

    getProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            const profile = await user_repository.getProfile(userId);
            if (!profile) return sendError(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
            return sendSuccess(res, 200, {
                user_id:      profile.user_id,
                email:        profile.email,
                display_name: profile.display_name,
                first_name:   profile.first_name,
                last_name:    profile.last_name,
                phone:        profile.phone ?? null,
                location:     profile.location ?? null,
                occupation:   profile.occupation ?? null,
                avatar_url:   profile.avatar_url ?? null,
                last_login_at: profile.last_login_at ?? null,
            });
        } catch (error) {
            logger.error('[user.controller][getProfile] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { display_name, email, phone, location, occupation, avatar_url } = req.body ?? {};

            // Validate and check uniqueness of new email
            if (email !== undefined && email !== null) {
                const trimmed = email.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    return sendError(res, 400, 'INVALID_EMAIL', 'El correo no tiene un formato válido.');
                }
                const current = await user_repository.getProfile(userId);
                if (current && trimmed.toLowerCase() !== current.email.toLowerCase()) {
                    const available = await user_repository.validateEmailAvailable(trimmed, userId);
                    if (available === null) return sendError(res, 500, 'INTERNAL_ERROR', 'Error al validar el correo.');
                    if (!available) return sendError(res, 409, 'EMAIL_TAKEN', 'Este correo ya está en uso por otra cuenta.');
                }
            }

            const ok = await user_repository.updateProfile(userId, {
                display_name: display_name?.trim() || null,
                email:        email?.trim()        || null,
                phone:        phone?.trim()        || null,
                location:     location?.trim()     || null,
                occupation:   occupation?.trim()   || null,
                avatar_url:   avatar_url           ?? null,
            });
            if (!ok) return sendError(res, 500, 'UPDATE_FAILED', 'No se pudo actualizar el perfil.');
            const updated = await user_repository.getProfile(userId);
            return sendSuccess(res, 200, {
                user_id:      updated.user_id,
                email:        updated.email,
                display_name: updated.display_name,
                phone:        updated.phone        ?? null,
                location:     updated.location     ?? null,
                occupation:   updated.occupation   ?? null,
                avatar_url:   updated.avatar_url   ?? null,
            });
        } catch (error) {
            logger.error('[user.controller][updateProfile] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },

    initAvatarUpload: async (req, res) => {
        try {
            const userId = req.user?.id;
            const ext = req.body?.ext ?? 'jpg';
            const blobPath = `avatars/${userId}/avatar.${ext}`;
            const uploadUrl = await azure_storage_service.generateUploadUrl(blobPath);
            if (!uploadUrl) return sendError(res, 500, 'INTERNAL_ERROR', 'No se pudo generar URL de subida.');
            const avatar_url = await azure_storage_service.buildBlobUrl(blobPath);
            return sendSuccess(res, 201, { upload_url: uploadUrl, avatar_url });
        } catch (error) {
            logger.error('[user.controller][initAvatarUpload] Error: ' + error.message);
            return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
        }
    },
};

module.exports = user_controller;
