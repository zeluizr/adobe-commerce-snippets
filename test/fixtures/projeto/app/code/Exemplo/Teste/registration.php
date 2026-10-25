<?php
// Fixture dos testes: registro de um módulo em app/code.
use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::MODULE, 'Exemplo_Teste', __DIR__);
