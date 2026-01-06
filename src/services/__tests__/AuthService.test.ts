import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock toast utils
vi.mock('@/utils/toast', () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
}))

// We need to import AuthService after mocking localStorage
import AuthService from '../AuthService'

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorageMock.getItem.mockReturnValue(null)
    })

    describe('isAuthenticated', () => {
        it('should return false when no token is stored', () => {
            expect(AuthService.isAuthenticated()).toBe(false)
        })
    })

    describe('getUser', () => {
        it('should return null when no user is stored', () => {
            expect(AuthService.getUser()).toBe(null)
        })
    })

    describe('getToken', () => {
        it('should return null/undefined when no token is stored', () => {
            expect(AuthService.getToken()).toBeFalsy()
        })
    })

    describe('getHeaders', () => {
        it('should return headers with Authorization and Content-Type', () => {
            const headers = AuthService.getHeaders()
            expect(headers).toHaveProperty('Authorization')
            expect(headers).toHaveProperty('Content-Type', 'application/json')
        })

        it('should include Bearer token in Authorization header', () => {
            const headers = AuthService.getHeaders()
            expect(headers.Authorization).toMatch(/^Bearer /)
        })
    })

    describe('login', () => {
        it('should return false on failed login', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ message: 'Invalid credentials' }),
            })

            const result = await AuthService.login('wrong', 'password')
            expect(result).toBe(false)
        })

        it('should return true and store token on successful login', async () => {
            const mockUser = { id: 1, username: 'admin', is_admin: true }
            const mockToken = 'test-jwt-token'

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ token: mockToken, user: mockUser }),
            })

            const result = await AuthService.login('admin', 'password')
            expect(result).toBe(true)
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
            expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
        })
    })

    describe('logout', () => {
        it('should remove token and user from localStorage', () => {
            AuthService.logout()
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
        })
    })

    describe('checkTokenValidity', () => {
        it('should return false when response is not ok', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: false })

            const result = await AuthService.checkTokenValidity()
            expect(result).toBe(false)
        })
    })
})
