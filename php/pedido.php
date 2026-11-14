<?php
/**
 * Recebe o formulário "Solicitar avaliação técnica" (js/daner.js) e envia um email
 * para a equipa comercial. Responde sempre em JSON: {"ok": true|false}.
 * O destinatário e o remetente estão em php/config.php.
 */
header("Content-Type: application/json; charset=utf-8");
$config = require __DIR__ . "/config.php";

// Só aceita POST e ignora robots (o campo "website" está escondido e deve vir vazio).
if ($_SERVER["REQUEST_METHOD"] !== "POST" || !empty($_POST["website"])) {
    echo json_encode(["ok" => false]);
    exit;
}

// Lê um campo do formulário, sem espaços nem HTML.
function campo($nome)
{
    return trim(strip_tags($_POST[$nome] ?? ""));
}

$nome     = campo("nome");
$contacto = campo("contacto");
$servico  = campo("servico");
$mensagem = campo("mensagem");

// Nome, contacto (e-mail ou telefone), serviço e descrição são obrigatórios.
if (!$nome || !$contacto || !$servico || !$mensagem) {
    echo json_encode(["ok" => false]);
    exit;
}

// Texto do email que a equipa comercial recebe.
$corpo = "Nome: $nome\n"
    . "Empresa: " . campo("empresa") . "\n"
    . "Contacto: $contacto\n"
    . "Serviço pretendido: $servico\n"
    . "Origem: " . campo("origem") . "\n\n"
    . "$mensagem\n";

$cabecalhos = "From: " . $config["from"] . "\r\nContent-Type: text/plain; charset=utf-8";

echo json_encode([
    "ok" => mail($config["to"], "Nova solicitação de avaliação técnica (site)", $corpo, $cabecalhos),
]);
