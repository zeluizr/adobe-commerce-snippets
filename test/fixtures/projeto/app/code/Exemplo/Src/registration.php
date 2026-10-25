<?php
// Fixture dos testes: o registro aponta para uma subpasta, com aspas duplas.
\Magento\Framework\Component\ComponentRegistrar::register(
	\Magento\Framework\Component\ComponentRegistrar::MODULE,
	"Exemplo_Src",
	__DIR__ . '/src'
);
