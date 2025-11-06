<?php
require_once 'vendor/autoload.php';

function trading_hours($currentHours, $currentMinutes)
{
    if ($currentHours >= 9 && $currentHours <= 16) {
        if ($currentHours == 9 && $currentMinutes < 31) {
            return false;
        }

        if ($currentHours == 16 && $currentMinutes > 0) {
            return false;
        }

        return true;
    }

    return false;
}

function get_conditions($polyClient)
{
    $returnConditions = [];

    $conditionsRequest = $polyClient->request('GET', '/v3/reference/conditions?asset_class=stocks&data_type=trade&limit=1000', [
        'headers'   =>  [
            'Authorization' =>  'Bearer Ew7C5GgWbF2HJ7dNkpVeSTuUATVUrdX7'
        ]
    ]);
    $conditionsResponse = $conditionsRequest->getBody()->getContents();
    $conditionsObject = json_decode($conditionsResponse, true);

    foreach ($conditionsObject['results'] as $conditionObject) {
        if (!empty($conditionObject['update_rules']['consolidated'])) {
            $returnConditions[$conditionObject['id']] = $conditionObject['update_rules']['consolidated'];
        }
    }

    return $returnConditions;
}

function get_tickets($polyClient, $polyLink, &$allTickers)
{
    $tickersRequest = $polyClient->request('GET', $polyLink, [
        'headers'   =>  [
            'Authorization' =>  'Bearer Ew7C5GgWbF2HJ7dNkpVeSTuUATVUrdX7'
        ]
    ]);
    $tickersResponse = $tickersRequest->getBody()->getContents();
    $tickersObject = json_decode($tickersResponse, true);

    $tickersSymbols = array_column($tickersObject['results'], 'ticker');

    $allTickers = array_merge($allTickers, $tickersSymbols);

    if (!empty($tickersObject['next_url'])) {
        $newPolyLink = str_replace('https://api.polygon.io', '', $tickersObject['next_url']);
        get_tickets($polyClient, $newPolyLink, $allTickers);
    }
}