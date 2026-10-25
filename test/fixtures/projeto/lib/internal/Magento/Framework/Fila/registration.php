<?php
// Fixture dos testes: uma subbiblioteca do framework (framework-<subnome>).
use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::LIBRARY, 'magento/framework-fila', __DIR__);
