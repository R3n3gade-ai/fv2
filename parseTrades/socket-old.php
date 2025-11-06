<?php
ini_set('memory_limit', '-1');

require_once 'liveFunctions.php';

use Amp\Websocket\Client\Connection;
use Amp\Websocket\Message;
use GuzzleHttp\Client;
use function Amp\delay;
use function Amp\Websocket\Client\connect;

$polyClient = new Client([
    'base_uri'  =>  'https://api.polygon.io'
]);

echo "Getting Conditions \n";
$AllConditions = get_conditions($polyClient);

echo "Getting Tickers \n";
$allTickers = [];
get_tickets($polyClient, '/v3/reference/tickers?market=stocks&active=true&sort=ticker&order=asc&limit=1000', $allTickers);
echo "Found " . count($allTickers) . "Tickers \n";

$initialStates = array_fill(0, count($allTickers), [
    'parsedTrades' => [],
    'direction' => -1,
    'tick' => 0,
    'intervalCounter' => 0,
    'intervalParsedTrades' => [],
    'gotOpenClose' => false,
    'previousPrice' => false,
    'previousCurrentTimeFormat' => false,
    'previousNanoTimeStamp' => false,
    'initialUpDarkVolumes' => [
        'updark'    =>  0,
        'downdark'  =>  0,
        'upvol'     =>  0,
        'downvol'   =>  0
    ],
    'initialOHLCV' => [
        'open'      =>  0,
        'high'      =>  0,
        'low'       =>  500000,
        'close'     =>  0,
        'volume'    =>  0
    ]
]);
$runTimeStates = array_combine($allTickers, $initialStates);
$runTimeAeSenders = [];
$runTimeFlSenders = [];
$runTimeMsSenders = [];
$runTimeTzSenders = [];
$intervalRunTimeAeSenders = [];
$intervalRunTimeFlSenders = [];
$intervalRunTimeMsSenders = [];
$intervalRunTimeTzSenders = [];
$liveRunTimeAeSenders = [];
$liveRunTimeFlSenders = [];
$liveRunTimeMsSenders = [];
$liveRunTimeTzSenders = [];

$tickersDataFactory = (new Kreait\Firebase\Factory())
    ->withServiceAccount('firebaseCredentials.json')
    ->withDatabaseUri('https://tradingproject24-f513b-e8221ickersata-e8221.firebaseio.com');
$tickersDatabase = $tickersDataFactory->createDatabase();
$timeZone = new DateTimeZone('America/New_York');

$currentDateInstance = new Datetime();
$currentDateInstance->setTimezone($timeZone);

$neededDay = $currentDateInstance->format('Y-m-d');

// Connects to the Kaazing echoing websocket demo.
Amp\Loop::run(function () use(
    $AllConditions,
    $tickersDatabase,
    $timeZone,
    $neededDay,
    &$runTimeStates,
    &$runTimeAeSenders,
    &$runTimeFlSenders,
    &$runTimeMsSenders,
    &$runTimeTzSenders,
    &$intervalRunTimeAeSenders,
    &$intervalRunTimeFlSenders,
    &$intervalRunTimeMsSenders,
    &$intervalRunTimeTzSenders,
    &$liveRunTimeAeSenders,
    &$liveRunTimeFlSenders,
    &$liveRunTimeMsSenders,
    &$liveRunTimeTzSenders
) {
    /** @var Connection $connection */
    $connection = yield connect('wss://delayed.polygon.io/stocks');
    yield $connection->send(json_encode([
        'action'    =>  'auth',
        'params'    =>  'sGaP6bC36mepdAAoq7q9duJ7tyxe50yI'
    ]));

    yield $connection->send(json_encode([
        'action'    =>  'subscribe',
        'params'    =>  'T.*'
    ]));	

    \parallel\bootstrap('vendor/autoload.php');

    while ($message = yield $connection->receive()) {
        /** @var Message $message */
        $payload = yield $message->buffer();
        $payloadObject = json_decode($payload, true);
        $event = $payloadObject[0]['ev'];
        if ($event == 'T') {
            array_map(function ($nanoTrade) use(
                $timeZone,
                $AllConditions,
                $tickersDatabase,
                $neededDay,
                &$runTimeStates,
                &$runTimeAeSenders,
                &$runTimeFlSenders,
                &$runTimeMsSenders,
                &$runTimeTzSenders,
                &$intervalRunTimeAeSenders,
                &$intervalRunTimeFlSenders,
                &$intervalRunTimeMsSenders,
                &$intervalRunTimeTzSenders,
                &$liveRunTimeAeSenders,
                &$liveRunTimeFlSenders,
                &$liveRunTimeMsSenders,
                &$liveRunTimeTzSenders
            ) {
                if (empty($runTimeStates[$nanoTrade['sym']])) {
                    //echo "Symbol Not Found " . $nanoTrade['sym'] . "\n";
                    return;
                }

                $secondsTimestamp = substr($nanoTrade['t'], 0, -3);
                $currentTime = new DateTime();
                $currentTime->setTimezone($timeZone);
                $currentTime->setTimestamp($secondsTimestamp);
                $currentTimeFormat = $currentTime->format('Hi');
                $currentNanoTimeStamp = $currentTime->format('U') * 1000;

                $actualDate = $currentTime->format('Y-m-d');

                $isTradingHours = trading_hours(
                    intval($currentTime->format('H')),
                    intval($currentTime->format('i'))
                );

                if ($runTimeStates[$nanoTrade['sym']]['previousCurrentTimeFormat'] !== false &&
                    $runTimeStates[$nanoTrade['sym']]['previousCurrentTimeFormat'] != $currentTimeFormat) {
                    if ($isTradingHours) {
                        $currentTradePayload = array_merge([
                            'O'             =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['open'],
                            'H'             =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['high'],
                            'L'             =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['low'],
                            'C'             =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['close'],
                            'V'             =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume'],
                            'T'             =>  $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp'],
                            'MO'            =>  $runTimeStates[$nanoTrade['sym']]['gotOpenClose'] == false ? 0 : $runTimeStates[$nanoTrade['sym']]['gotOpenClose']
                        ], [
                            'U'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'],
                            'D'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'],
                            'DU'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'],
                            'DD'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark']
                        ]);
                        $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][] = $currentTradePayload;

                        if (in_array(strtolower($nanoTrade['sym'][0]), range('a', 'e'))) {
                            $runTimeAeSenders[
                            '1m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp']
                            ] = $currentTradePayload;
                        }

                        if (in_array(strtolower($nanoTrade['sym'][0]), range('f', 'l'))) {
                            $runTimeFlSenders[
                            '1m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp']
                            ] = $currentTradePayload;
                        }

                        if (in_array(strtolower($nanoTrade['sym'][0]), range('m', 's'))) {
                            $runTimeMsSenders[
                            '1m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp']
                            ] = $currentTradePayload;
                        }

                        if (in_array(strtolower($nanoTrade['sym'][0]), range('t', 'z'))) {
                            $runTimeTzSenders[
                            '1m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp']
                            ] = $currentTradePayload;
                        }

                        if ((intval(substr($currentTimeFormat, -2)) % 15) == 0 && $currentTimeFormat != '0930') {
                            if (!empty($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'])) {
                                $aggregatedTimeStamp = array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'T')[0];
                                $highCountBlock = count( $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades']) - 1;

                                if (in_array(strtolower($nanoTrade['sym'][0]), range('a', 'e'))) {
                                    $intervalRunTimeAeSenders[
                                    '15m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $aggregatedTimeStamp
                                    ] = [
                                        'O'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][0]['O'],
                                        'H'     =>  max(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'H')),
                                        'L'     =>  min(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'L')),
                                        'C'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['C'],
                                        'MO'    =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['MO'] ?? 0,
                                        'T'     =>  $aggregatedTimeStamp,
                                        'D'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'D')),
                                        'U'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'U')),
                                        'DD'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DD')),
                                        'DU'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DU')),
                                        'V'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'V')),
                                    ];
                                }

                                if (in_array(strtolower($nanoTrade['sym'][0]), range('f', 'l'))) {
                                    $intervalRunTimeFlSenders[
                                    '15m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $aggregatedTimeStamp
                                    ] = [
                                        'O'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][0]['O'],
                                        'H'     =>  max(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'H')),
                                        'L'     =>  min(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'L')),
                                        'C'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['C'],
                                        'MO'    =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['MO'] ?? 0,
                                        'T'     =>  $aggregatedTimeStamp,
                                        'D'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'D')),
                                        'U'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'U')),
                                        'DD'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DD')),
                                        'DU'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DU')),
                                        'V'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'V')),
                                    ];
                                }

                                if (in_array(strtolower($nanoTrade['sym'][0]), range('m', 's'))) {
                                    $intervalRunTimeMsSenders[
                                    '15m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $aggregatedTimeStamp
                                    ] = [
                                        'O'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][0]['O'],
                                        'H'     =>  max(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'H')),
                                        'L'     =>  min(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'L')),
                                        'C'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['C'],
                                        'MO'    =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['MO'] ?? 0,
                                        'T'     =>  $aggregatedTimeStamp,
                                        'D'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'D')),
                                        'U'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'U')),
                                        'DD'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DD')),
                                        'DU'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DU')),
                                        'V'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'V')),
                                    ];
                                }

                                if (in_array(strtolower($nanoTrade['sym'][0]), range('t', 'z'))) {
                                    $intervalRunTimeTzSenders[
                                    '15m/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $aggregatedTimeStamp
                                    ] = [
                                        'O'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][0]['O'],
                                        'H'     =>  max(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'H')),
                                        'L'     =>  min(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'L')),
                                        'C'     =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['C'],
                                        'MO'    =>  $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'][$highCountBlock]['MO'] ?? 0,
                                        'T'     =>  $aggregatedTimeStamp,
                                        'D'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'D')),
                                        'U'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'U')),
                                        'DD'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DD')),
                                        'DU'    =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'DU')),
                                        'V'     =>  array_sum(array_column($runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'], 'V')),
                                    ];
                                }
                            }

                            $runTimeStates[$nanoTrade['sym']]['intervalCounter'] = 0;
                            $runTimeStates[$nanoTrade['sym']]['intervalParsedTrades'] = [];
                        }
                    }

                    $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes'] = [
                        'updark'    =>  0,
                        'downdark'  =>  0,
                        'upvol'     =>  0,
                        'downvol'   =>  0
                    ];
                    $runTimeStates[$nanoTrade['sym']]['initialOHLCV'] = [
                        'open'      =>  0,
                        'high'      =>  0,
                        'low'       =>  500000,
                        'close'     =>  0,
                        'volume'    =>  0
                    ];
                }

                $runTimeStates[$nanoTrade['sym']]['previousNanoTimeStamp'] = $currentNanoTimeStamp;
                $runTimeStates[$nanoTrade['sym']]['previousCurrentTimeFormat'] = $currentTimeFormat;

                $initialConditions = [
                    'open_close'    =>  true,
                    'high_low'      =>  true,
                    'volume'        =>  true
                ];

                if (!empty($nanoTrade['c'])) {
                    foreach ($nanoTrade['c'] as $nanoCondition) {
                        if (!empty($AllConditions[$nanoCondition])) {
                            $openCloseCondition = $AllConditions[$nanoCondition]['updates_open_close'];
                            $highLowCondition = $AllConditions[$nanoCondition]['updates_high_low'];
                            $volumeCondition = $AllConditions[$nanoCondition]['updates_volume'];

                            if (in_array($nanoCondition, [17])) {
                                if ($nanoCondition == 17) {
                                    if (!$runTimeStates[$nanoTrade['sym']]['gotOpenClose'] || count($nanoTrade['c']) == 1) {
                                        $openCloseCondition = true;
                                    }
                                }

                                if ($nanoCondition == 22 || $nanoCondition == 33) {
                                    if (count($nanoTrade['c']) == 1) {
                                        $openCloseCondition = true;
                                    }
                                }
                            }

                            $initialConditions['open_close'] = $initialConditions['open_close'] && $openCloseCondition;
                            $initialConditions['high_low'] = $initialConditions['high_low'] && $highLowCondition;
                            $initialConditions['volume'] = $initialConditions['volume'] && $volumeCondition;
                        }
                    }
                }

                if ($runTimeStates[$nanoTrade['sym']]['gotOpenClose'] == false) {
                    if ($initialConditions['open_close']) {
                        $runTimeStates[$nanoTrade['sym']]['gotOpenClose'] = $nanoTrade['p'];
                    }
                }

                $isVolume = $initialConditions['volume'];
                $isDark = $nanoTrade['x'] == 4;

                if ($initialConditions['open_close']) {
                    if ($runTimeStates[$nanoTrade['sym']]['previousPrice']) {
                        $runTimeStates[$nanoTrade['sym']]['tick'] = $nanoTrade['p'] - $runTimeStates[$nanoTrade['sym']]['previousPrice'];
                    } else {
                        $runTimeStates[$nanoTrade['sym']]['tick'] = $nanoTrade['p'];
                    }

                    $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['close'] = $nanoTrade['p'];
                    if ($runTimeStates[$nanoTrade['sym']]['initialOHLCV']['open'] == 0) $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['open'] = $nanoTrade['p'];
                }

                if ($initialConditions['high_low']) {
                    if ($nanoTrade['p'] > $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['high']) {
                        $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['high'] = $nanoTrade['p'];
                    }

                    if ($nanoTrade['p'] < $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['low']) {
                        $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['low'] = $nanoTrade['p'];
                    }
                }

                if ($runTimeStates[$nanoTrade['sym']]['tick'] == 0) {
                    if ($initialConditions['open_close']) {
                        if ($isVolume) {
                            if ($isDark) {
                                if ($runTimeStates[$nanoTrade['sym']]['direction'] == 1) {
                                    $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'] += $nanoTrade['s'];
                                } else {
                                    $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'] += $nanoTrade['s'];
                                }
                            } else {
                                if ($runTimeStates[$nanoTrade['sym']]['direction'] == 1) {
                                    $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'] += $nanoTrade['s'];
                                } else {
                                    $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'] += $nanoTrade['s'];
                                }
                            }
                        }
                    }
                } else if ($runTimeStates[$nanoTrade['sym']]['tick'] > 0) {
                    if ($initialConditions['open_close']) {
                        $runTimeStates[$nanoTrade['sym']]['direction'] = 1;
                        if ($isVolume) {
                            if ($isDark) {
                                $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'] += $nanoTrade['s'];
                            } else {
                                $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'] += $nanoTrade['s'];
                            }
                        }
                    }
                } else {
                    if ($initialConditions['open_close']) {
                        $runTimeStates[$nanoTrade['sym']]['direction'] = -1;
                        if ($isVolume) {
                            if ($isDark) {
                                $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'] += $nanoTrade['s'];
                            } else {
                                $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'] += $nanoTrade['s'];
                            }
                        }
                    }
                }

                if ($isVolume) {
                    if ($nanoTrade['s'] > 99999 && $nanoTrade['p'] > 10) {
                        $currentNanoSecond = $currentTime->format('U') * 1000;
                        \parallel\run(function($nanoTrade, $actualDate, $isDark, $currentNanoSecond, $direction) {
                            $blocksTickersDataFactory = (new Kreait\Firebase\Factory())
                                ->withServiceAccount('firebaseCredentials.json')
                                ->withDatabaseUri('https://tradingproject24-f513b-e8221blocks-e8221.firebaseio.com');

                            $tickersDatabase = $blocksTickersDataFactory->createDatabase();

                            $newPostKey = $tickersDatabase->getReference(str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate)->push()->getKey();
                            $tickersDatabase->getReference(
                                'symbols/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $actualDate . '/' . $newPostKey
                            )->set([
                                'S' =>  $nanoTrade['s'],
                                'Sy'=>  str_replace('.', '_', $nanoTrade['sym']),
                                'P' =>  $nanoTrade['p'],
                                't' =>  $currentNanoSecond,
                                'D' =>  $isDark,
                                'U' =>  $direction,
                                'E' =>  $nanoTrade['x'],
                                'C' =>  $nanoTrade['c'] ?? []
                            ]);

                            $tickersDatabase->getReference(
                                'latest/' . $newPostKey
                            )->set([
                                'S' =>  $nanoTrade['s'],
                                'Sy'=>  str_replace('.', '_', $nanoTrade['sym']),
                                'P' =>  $nanoTrade['p'],
                                't' =>  $currentNanoSecond,
                                'D' =>  $isDark,
                                'U' =>  $direction,
                                'E' =>  $nanoTrade['x'],
                                'C' =>  $nanoTrade['c'] ?? []
                            ]);

                            $tickersDatabase->getReference(
                                'latestSymbols/' . str_replace('.', '_', $nanoTrade['sym']) . '/' . $newPostKey
                            )->set([
                                'S' =>  $nanoTrade['s'],
                                'Sy'=>  str_replace('.', '_', $nanoTrade['sym']),
                                'P' =>  $nanoTrade['p'],
                                't' =>  $currentNanoSecond,
                                'D' =>  $isDark,
                                'U' =>  $direction,
                                'E' =>  $nanoTrade['x'],
                                'C' =>  $nanoTrade['c'] ?? []
                            ]);
                        }, [$nanoTrade, $actualDate, $isDark, $currentNanoSecond, $runTimeStates[$nanoTrade['sym']]['direction']]);
                    }

                    if (!$isDark) {
                        $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume'] += $nanoTrade['s'];
                    }
                }

                if ($initialConditions['open_close']) {
                    $runTimeStates[$nanoTrade['sym']]['previousPrice'] = $nanoTrade['p'];

                    if (in_array(strtolower($nanoTrade['sym'][0]), range('a', 'e'))) {
                        $liveRunTimeAeSenders[
                        str_replace('.', '_', $nanoTrade['sym'])
                        ] = [
                            'C'     =>  $runTimeStates[$nanoTrade['sym']]['previousPrice'],
                            'D'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'],
                            'U'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'],
                            'DD'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'],
                            'DU'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'],
                            'V'     =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume']
                        ];
                    }

                    if (in_array(strtolower($nanoTrade['sym'][0]), range('f', 'l'))) {
                        $liveRunTimeFlSenders[
                        str_replace('.', '_', $nanoTrade['sym'])
                        ] = [
                            'C'     =>  $runTimeStates[$nanoTrade['sym']]['previousPrice'],
                            'D'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'],
                            'U'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'],
                            'DD'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'],
                            'DU'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'],
                            'V'     =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume']
                        ];
                    }

                    if (in_array(strtolower($nanoTrade['sym'][0]), range('m', 's'))) {
                        $liveRunTimeMsSenders[
                        str_replace('.', '_', $nanoTrade['sym'])
                        ] = [
                            'C'     =>  $runTimeStates[$nanoTrade['sym']]['previousPrice'],
                            'D'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'],
                            'U'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'],
                            'DD'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'],
                            'DU'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'],
                            'V'     =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume']
                        ];
                    }

                    if (in_array(strtolower($nanoTrade['sym'][0]), range('t', 'z'))) {
                        $liveRunTimeTzSenders[
                        str_replace('.', '_', $nanoTrade['sym'])
                        ] = [
                            'C'     =>  $runTimeStates[$nanoTrade['sym']]['previousPrice'],
                            'D'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downvol'],
                            'U'     =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['upvol'],
                            'DD'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['downdark'],
                            'DU'    =>  $runTimeStates[$nanoTrade['sym']]['initialUpDarkVolumes']['updark'],
                            'V'     =>  $runTimeStates[$nanoTrade['sym']]['initialOHLCV']['volume']
                        ];
                    }
                };
            }, $payloadObject);

            if (!empty($runTimeAeSenders) && count($runTimeAeSenders) > 200) {
                \parallel\run(function($runTimeAeSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersae-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($runTimeAeSenders)) {
                        $tickersDatabase->getReference()->update($runTimeAeSenders);
                    }
                }, [$runTimeAeSenders]);
                $runTimeAeSenders = [];
            }
            if (!empty($runTimeFlSenders) && count($runTimeFlSenders) > 200) {
                \parallel\run(function($runTimeFlSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersfl-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($runTimeFlSenders)) {
                        $tickersDatabase->getReference()->update($runTimeFlSenders);
                    }
                }, [$runTimeFlSenders]);
                $runTimeFlSenders = [];
            }
            if (!empty($runTimeMsSenders) && count($runTimeMsSenders) > 200) {
                \parallel\run(function($runTimeMsSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersms-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($runTimeMsSenders)) {
                        $tickersDatabase->getReference()->update($runTimeMsSenders);
                    }
                }, [$runTimeMsSenders]);
                $runTimeMsSenders = [];
            }
            if (!empty($runTimeTzSenders) && count($runTimeTzSenders) > 200) {
                \parallel\run(function($runTimeTzSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickerstz-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($runTimeTzSenders)) {
                        $tickersDatabase->getReference()->update($runTimeTzSenders);
                    }
                }, [$runTimeTzSenders]);
                $runTimeTzSenders = [];
            }


            // Interval Runners
            if (!empty($intervalRunTimeAeSenders) && count($intervalRunTimeAeSenders) > 200) {
                \parallel\run(function($intervalRunTimeAeSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersae-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($intervalRunTimeAeSenders)) {
                        $tickersDatabase->getReference()->update($intervalRunTimeAeSenders);
                    }
                }, [$intervalRunTimeAeSenders]);
                $intervalRunTimeAeSenders = [];
            }
            if (!empty($intervalRunTimeFlSenders) && count($intervalRunTimeFlSenders) > 200) {
                \parallel\run(function($intervalRunTimeFlSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersfl-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($intervalRunTimeFlSenders)) {
                        $tickersDatabase->getReference()->update($intervalRunTimeFlSenders);
                    }
                }, [$intervalRunTimeFlSenders]);
                $intervalRunTimeFlSenders = [];
            }
            if (!empty($intervalRunTimeMsSenders) && count($intervalRunTimeMsSenders) > 200) {
                \parallel\run(function($intervalRunTimeMsSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickersms-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($intervalRunTimeMsSenders)) {
                        $tickersDatabase->getReference()->update($intervalRunTimeMsSenders);
                    }
                }, [$intervalRunTimeMsSenders]);
                $intervalRunTimeMsSenders = [];
            }
            if (!empty($intervalRunTimeTzSenders) && count($intervalRunTimeTzSenders) > 200) {
                \parallel\run(function($intervalRunTimeTzSenders) {
                    $tickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221tickerstz-e8221.firebaseio.com');
                    $tickersDatabase = $tickersDataFactory->createDatabase();

                    if (!empty($intervalRunTimeTzSenders)) {
                        $tickersDatabase->getReference()->update($intervalRunTimeTzSenders);
                    }
                }, [$intervalRunTimeTzSenders]);
                $intervalRunTimeTzSenders = [];
            }

            // Lives Runners
            if (!empty($liveRunTimeAeSenders) && count($liveRunTimeAeSenders) > 200) {
                \parallel\run(function($liveRunTimeAeSenders) {
                    $liveTickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221livesae-e8221.firebaseio.com');
                    $tickersDatabase = $liveTickersDataFactory->createDatabase();

                    if (!empty($liveRunTimeAeSenders)) {
                        $tickersDatabase->getReference()->update($liveRunTimeAeSenders);
                    }
                }, [$liveRunTimeAeSenders]);
                $liveRunTimeAeSenders = [];
            }
            if (!empty($liveRunTimeFlSenders) && count($liveRunTimeFlSenders) > 200) {
                \parallel\run(function($liveRunTimeFlSenders) {
                    $liveTickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221livesfl-e8221.firebaseio.com');
                    $tickersDatabase = $liveTickersDataFactory->createDatabase();

                    if (!empty($liveRunTimeFlSenders)) {
                        $tickersDatabase->getReference()->update($liveRunTimeFlSenders);
                    }
                }, [$liveRunTimeFlSenders]);
                $liveRunTimeFlSenders = [];
            }
            if (!empty($liveRunTimeMsSenders) && count($liveRunTimeMsSenders) > 200) {
                \parallel\run(function($liveRunTimeMsSenders) {
                    $liveTickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221livesms-e8221.firebaseio.com');
                    $tickersDatabase = $liveTickersDataFactory->createDatabase();

                    if (!empty($liveRunTimeMsSenders)) {
                        $tickersDatabase->getReference()->update($liveRunTimeMsSenders);
                    }
                }, [$liveRunTimeMsSenders]);
                $liveRunTimeMsSenders = [];
            }
            if (!empty($liveRunTimeTzSenders) && count($liveRunTimeTzSenders) > 200) {
                \parallel\run(function($liveRunTimeTzSenders) {
                    $liveTickersDataFactory = (new Kreait\Firebase\Factory())
                        ->withServiceAccount('firebaseCredentials.json')
                        ->withDatabaseUri('https://tradingproject24-f513b-e8221livestz-e8221.firebaseio.com');
                    $tickersDatabase = $liveTickersDataFactory->createDatabase();

                    if (!empty($liveRunTimeTzSenders)) {
                        $tickersDatabase->getReference()->update($liveRunTimeTzSenders);
                    }
                }, [$liveRunTimeTzSenders]);
                $liveRunTimeTzSenders = [];
            }
        } else {
            printf("Received: %s\n", $payload);
        }
    }
});