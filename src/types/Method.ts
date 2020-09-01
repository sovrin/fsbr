export const Methods = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options',
    '*'
] as const;

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 13:55
 */
export type Method = typeof Methods[number];