import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { isValidObjectId, Model } from 'mongoose';

import { type UpdateUserDto } from '@flare/shared';

import { User, type UserDocument } from '../mongoose/schemas/user.schema.js';

/**
 * Публичный профиль, возвращаемый клиенту.
 *
 * @prop {string} id - MongoDB ObjectId пользователя.
 * @prop {string} displayName - Отображаемое имя.
 * @prop {string} publicKey - Base64 X25519 публичный ключ.
 * @prop {string} [avatarUrl] - URL аватара.
 * @prop {Date} createdAt - Дата создания аккаунта.
 */
export interface PublicUserProfile {
  id: string;
  displayName: string;
  publicKey: string;
  avatarUrl?: string;
  createdAt: Date;
}

/**
 * Приватный профиль с полями, доступными только самому пользователю.
 */
export interface PrivateUserProfile extends PublicUserProfile {
  fcmToken?: string;
  updatedAt: Date;
}

/**
 * Сервис управления пользователями.
 * Основные операции — чтение собственного профиля, обновление, получение публичного ключа.
 */
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  /**
   * Возвращает приватный профиль по ID. Бросает 404, если пользователь не найден.
   *
   * @param userId - ID пользователя.
   * @returns Приватный профиль.
   */
  async getPrivateProfile(userId: string): Promise<PrivateUserProfile> {
    const user = await this.findByIdOrThrow(userId);
    return {
      id: user.id,
      displayName: user.displayName,
      publicKey: user.publicKey,
      avatarUrl: user.avatarUrl,
      fcmToken: user.fcmToken,
      createdAt: (user as UserDocument & { createdAt: Date }).createdAt,
      updatedAt: (user as UserDocument & { updatedAt: Date }).updatedAt,
    };
  }

  /**
   * Обновляет поля профиля текущего пользователя.
   *
   * @param userId - ID пользователя.
   * @param dto - Патч с обновляемыми полями.
   * @returns Обновлённый приватный профиль.
   */
  async updateProfile(userId: string, dto: UpdateUserDto): Promise<PrivateUserProfile> {
    await this.findByIdOrThrow(userId);
    await this.userModel.updateOne({ _id: userId }, { $set: dto });
    return this.getPrivateProfile(userId);
  }

  /**
   * Возвращает публичный ключ пользователя для E2E-шифрования.
   *
   * @param userId - ID пользователя.
   * @returns Объект с публичным ключом.
   */
  async getPublicKey(userId: string): Promise<{ userId: string; publicKey: string }> {
    if (!isValidObjectId(userId)) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    const user = await this.userModel.findById(userId).select('publicKey').lean();
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    return { userId, publicKey: user.publicKey };
  }

  /**
   * Сохраняет зашифрованный бэкап ключей пользователя.
   *
   * @param userId - ID пользователя.
   * @param encryptedBlob - Зашифрованный блоб в Base64.
   */
  async saveKeyBackup(userId: string, encryptedBlob: string): Promise<void> {
    await this.findByIdOrThrow(userId);
    await this.userModel.updateOne({ _id: userId }, { $set: { encryptedKeyBackup: encryptedBlob } });
  }

  /**
   * Возвращает зашифрованный бэкап ключей или null, если бэкап не создан.
   *
   * @param userId - ID пользователя.
   * @returns Зашифрованный блоб или null.
   */
  async getKeyBackup(userId: string): Promise<string | null> {
    const user = await this.findByIdOrThrow(userId);

    return user.encryptedKeyBackup ?? null;
  }

  private async findByIdOrThrow(userId: string): Promise<UserDocument> {
    if (!isValidObjectId(userId)) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    return user;
  }
}
