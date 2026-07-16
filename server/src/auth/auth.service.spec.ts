import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcryptjs'
import { User } from '../entities'
import { AuthService } from './auth.service'

const mockModel = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
})

const mockJwt = () => ({ sign: jest.fn().mockReturnValue('signed-token') })

describe('AuthService', () => {
  let service: AuthService
  let users: ReturnType<typeof mockModel>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useFactory: mockModel },
        { provide: JwtService, useFactory: mockJwt },
      ],
    }).compile()

    service = module.get(AuthService)
    users = module.get(getModelToken(User.name))
  })


  describe('register', () => {
    it('creates a user and returns a token when username is available', async () => {
      users.findOne.mockResolvedValue(null)
      const newUser = { _id: 'u1', username: 'alice', passwordHash: 'hash' }
      users.create.mockResolvedValue(newUser)

      const result = await service.register({ username: 'alice', password: 'pass123' })

      expect(users.findOne).toHaveBeenCalledWith({ username: 'alice' })
      expect(users.create).toHaveBeenCalled()
      expect(result).toEqual({ token: 'signed-token', username: 'alice' })
    })

    it('throws ConflictException when username already taken', async () => {
      users.findOne.mockResolvedValue({ _id: 'u1', username: 'alice' })
      await expect(service.register({ username: 'alice', password: 'pass' })).rejects.toThrow(
        ConflictException,
      )
    })
  })


  describe('login', () => {
    it('returns a token when credentials are valid', async () => {
      const hash = await bcrypt.hash('secret', 10)
      users.findOne.mockResolvedValue({ _id: 'u1', username: 'alice', passwordHash: hash })

      const result = await service.login({ username: 'alice', password: 'secret' })

      expect(result).toEqual({ token: 'signed-token', username: 'alice' })
    })

    it('throws UnauthorizedException when user not found', async () => {
      users.findOne.mockResolvedValue(null)
      await expect(service.login({ username: 'nobody', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correct', 10)
      users.findOne.mockResolvedValue({ _id: 'u1', username: 'alice', passwordHash: hash })
      await expect(service.login({ username: 'alice', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('throws UnauthorizedException when user has no password (OAuth user)', async () => {
      users.findOne.mockResolvedValue({ _id: 'u1', username: 'alice', passwordHash: null })
      await expect(service.login({ username: 'alice', password: 'any' })).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })


  describe('getProfile', () => {
    it('returns the user by id', async () => {
      const user = { _id: 'u1', username: 'alice' }
      users.findOne.mockResolvedValue(user)

      const result = await service.getProfile('u1')

      expect(users.findOne).toHaveBeenCalledWith({ _id: 'u1' })
      expect(result).toBe(user)
    })
  })


  describe('existsByUsername', () => {
    it('returns true when username exists', async () => {
      users.countDocuments.mockResolvedValue(1)
      expect(await service.existsByUsername('alice')).toBe(true)
    })

    it('returns false when username does not exist', async () => {
      users.countDocuments.mockResolvedValue(0)
      expect(await service.existsByUsername('nobody')).toBe(false)
    })
  })
})
