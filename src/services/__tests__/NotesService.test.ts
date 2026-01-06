import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AuthService
vi.mock('../AuthService', () => ({
    default: {
        getHeaders: vi.fn().mockReturnValue({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
        }),
    },
}))

// Mock toast utils
vi.mock('@/utils/toast', () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
}))

import NotesService from '../NotesService'

describe('NotesService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getNotes', () => {
        it('should fetch notes and return them with default arrays', async () => {
            const mockNotes = [
                { id: 1, title: 'Note 1', content: 'Content 1' },
                { id: 2, title: 'Note 2', content: 'Content 2', todos: [{ id: 1, text: 'Task', completed: false }] },
            ]

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockNotes),
            })

            const result = await NotesService.getNotes()

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/notes?archived=false',
                expect.objectContaining({
                    headers: expect.any(Object),
                })
            )

            expect(result).toHaveLength(2)
            expect(result[0].todos).toEqual([])
            expect(result[0].images).toEqual([])
            expect(result[1].todos).toHaveLength(1)
        })

        it('should return empty array on error', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
            })

            const result = await NotesService.getNotes()
            expect(result).toEqual([])
        })
    })

    describe('getCounts', () => {
        it('should return counts from API', async () => {
            const mockCounts = { active: 5, archived: 2 }

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCounts),
            })

            const result = await NotesService.getCounts()
            expect(result).toEqual(mockCounts)
        })

        it('should return zero counts on error', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
            })

            const result = await NotesService.getCounts()
            expect(result).toEqual({ active: 0, archived: 0 })
        })
    })

    describe('createNote', () => {
        it('should create a note and return it', async () => {
            const mockNote = { id: 1, title: 'New Note', content: '', todos: [], images: [] }

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockNote),
            })

            const result = await NotesService.createNote('New Note')

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/notes',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ title: 'New Note', content: '', todos: [] }),
                })
            )

            expect(result).toEqual(mockNote)
        })

        it('should return null on error', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })

            const result = await NotesService.createNote('Test')
            expect(result).toBeNull()
        })
    })

    describe('deleteNote', () => {
        it('should delete a note and return true', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Deleted' }),
            })

            const result = await NotesService.deleteNote(1)

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/notes/1',
                expect.objectContaining({ method: 'DELETE' })
            )
            expect(result).toBe(true)
        })

        it('should return false on error', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })

            const result = await NotesService.deleteNote(1)
            expect(result).toBe(false)
        })
    })

    describe('updateNote', () => {
        it('should return null if note has no id', async () => {
            const result = await NotesService.updateNote({ title: 'Test', content: '', todos: [], images: [] })
            expect(result).toBeNull()
        })

        it('should update note and return it', async () => {
            const note = { id: 1, title: 'Updated', content: 'New content', todos: [], images: [] }

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ note }),
            })

            const result = await NotesService.updateNote(note)
            expect(result).toEqual(note)
        })
    })
})
