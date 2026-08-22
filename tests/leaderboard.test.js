import { describe, it, expect } from 'vitest';
import { onRequestGet } from '../functions/api/leaderboard.js';

describe('Devotees Leaderboard Endpoint (ديوان صفوة العباد)', () => {
    it('returns devotees leaderboard with real rank titles and zero-state handling', async () => {
        const mockDb = {
            prepare: (sql) => ({
                bind: (...args) => ({
                    all: async () => ({
                        results: [
                            {
                                id: 'usr_1',
                                username: 'zealot1',
                                x_handle: 'zealot1_x',
                                role: 'user',
                                devotion_points: 550000,
                                tributes_count: 120,
                                sealed_surahs: 28,
                                meditation_minutes: 300,
                                current_streak: 15,
                                longest_streak: 20
                            }
                        ]
                    })
                }),
                all: async () => ({
                    results: [
                        {
                            id: 'usr_1',
                            username: 'zealot1',
                            x_handle: 'zealot1_x',
                            role: 'user',
                            devotion_points: 550000,
                            tributes_count: 120,
                            sealed_surahs: 28,
                            meditation_minutes: 300,
                            current_streak: 15,
                            longest_streak: 20
                        }
                    ]
                })
            })
        };

        const req = new Request('https://test.local/api/leaderboard?type=devotees&filter=devotion');
        const res = await onRequestGet({
            env: { DB: mockDb },
            request: req,
            data: { user: { id: 'usr_1' } }
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.type).toBe('devotees');
        expect(json.data.filter).toBe('devotion');
        expect(json.data.leaderboard.length).toBe(1);
        
        const topDevotee = json.data.leaderboard[0];
        expect(topDevotee.username).toBe('zealot1');
        expect(topDevotee.devotionPoints).toBe(550000);
        expect(topDevotee.sealedSurahs).toBe(28);
        expect(topDevotee.meditationMinutes).toBe(300);
        expect(topDevotee.isMe).toBe(true);
        expect(topDevotee.rankTitle).toContain('كاهن المذلّة');
    });

    it('handles character-specific devotee query (خادم السلطانة الأخلص)', async () => {
        const mockDb = {
            prepare: (sql) => ({
                bind: (...args) => ({
                    all: async () => ({
                        results: [
                            {
                                id: 'usr_2',
                                username: 'servant2',
                                x_handle: 'servant2_x',
                                role: 'user',
                                char_devotion: 2500,
                                char_tributes: 45,
                                devotion_points: 10000,
                                sealed_surahs: 5,
                                meditation_minutes: 60,
                                current_streak: 3
                            }
                        ]
                    })
                })
            })
        };

        const req = new Request('https://test.local/api/leaderboard?type=devotees&filter=character&characterId=char_99');
        const res = await onRequestGet({
            env: { DB: mockDb },
            request: req,
            data: { user: { id: 'usr_other' } }
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.type).toBe('devotees');
        expect(json.data.filter).toBe('character');
        expect(json.data.characterId).toBe('char_99');
        expect(json.data.leaderboard[0].charDevotion).toBe(2500);
        expect(json.data.leaderboard[0].isMe).toBe(false);
    });

    it('handles goddesses (الإله الأكبر) supreme devotion leaderboard', async () => {
        const mockDb = {
            prepare: (sql) => ({
                bind: (...args) => ({
                    all: async () => {
                        if (sql.includes('character_images')) {
                            return {
                                results: [
                                    { character_id: 'goddess_1', image_url: 'https://img.local/1.jpg', display_order: 1 }
                                ]
                            };
                        }
                        if (sql.includes('ORDER BY p.character_id, devotion DESC')) {
                            return {
                                results: [
                                    { character_id: 'goddess_1', username: 'top_zealot', devotion: 12000 }
                                ]
                            };
                        }
                        return {
                            results: [
                                {
                                    id: 'goddess_1',
                                    name: 'Empress Supreme',
                                    category: 'sluts',
                                    label: 'Goddess',
                                    total_community_devotion: 850000,
                                    total_community_tributes: 4200,
                                    total_devotees_count: 50
                                }
                            ]
                        };
                    }
                })
            })
        };

        const req = new Request('https://test.local/api/leaderboard?type=goddesses&category=all');
        const res = await onRequestGet({
            env: { DB: mockDb },
            request: req,
            data: { user: { id: 'usr_1' } }
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.type).toBe('goddesses');
        expect(json.data.leaderboard.length).toBe(1);
        
        const topGoddess = json.data.leaderboard[0];
        expect(topGoddess.name).toBe('Empress Supreme');
        expect(topGoddess.totalCommunityDevotion).toBe(850000);
        expect(topGoddess.totalDevoteesCount).toBe(50);
        expect(topGoddess.image).toBe('https://img.local/1.jpg');
        expect(topGoddess.topDevotee.username).toBe('top_zealot');
        expect(topGoddess.topDevotee.devotion).toBe(12000);
    });
});

