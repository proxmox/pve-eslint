(function () {
'use strict';

const color = require('colors');
const program = require('commander');

program
    .usage('[options] [<file(s) ...>]')
    .option('-c, --config <configfile>', 'uses <configfile> for eslint config instead.')
    .option('-f, --fix', 'if set, fixes will be applied.');

program.on('--help', function() {
    console.log('');
    console.log('  Description:');
    console.log('');
    console.log('    lints javascript files');
    console.log('');
});

if (process.argv.length <= 2) {
    program.help();
}

program.parse(process.argv);

let paths = program.args;

if (!paths.length) {
    paths = [process.cwd()];
}

const defaultConfig = {
    parserOptions: {
	ecmaVersion: 2017,
	ecmaFeatures: {
	    impliedStrict: true,
	}
    },
    env: {
	browser: true,
	node: true,
	es2017: true,
    },
    globals: {
	Ext: "writable",
	FormData: "writable",
	PBS: "writable",
	PMG: "writable",
	PVE: "writable",
	PVE_vnc_console_event: "writable",
	Proxmox: "writable",
	console: "writable",
	eslint: "writable",
	gettext: "writable",
    },
    rules: {
	// from eslint:recommend, with tweaks for our source
	"constructor-super": "error",
	"for-direction": "error",
	"getter-return": "error",
	"no-async-promise-executor": "error",
	"no-case-declarations": "error",
	"no-class-assign": "error",
	"no-compare-neg-zero": "error",
	"no-cond-assign": "error",
	"no-const-assign": "error",
	"no-constant-condition": "error",
	"no-control-regex": "error",
	"no-debugger": "error",
	"no-delete-var": "error",
	"no-dupe-args": "error",
	"no-dupe-class-members": "error",
	"no-dupe-else-if": "error",
	"no-dupe-keys": "error",
	"no-duplicate-case": "error",
	"no-empty": "error",
	"no-empty-character-class": "error",
	"no-empty-pattern": "error",
	"no-ex-assign": "error",
	"no-extra-boolean-cast": "error",
	"no-extra-semi": "error",
	"no-fallthrough": "error",
	"no-func-assign": "error",
	"no-global-assign": "error",
	"no-import-assign": "error",
	"no-inner-declarations": "error",
	"no-invalid-regexp": "error",
	"no-irregular-whitespace": "error",
	"no-misleading-character-class": "error",
	"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
	"no-new-symbol": "error",
	"no-obj-calls": "error",
	"no-octal": "error",
	"no-prototype-builtins": "error",
	"no-redeclare": "error",
	"no-regex-spaces": "error",
	"no-self-assign": "error",
	"no-setter-return": "error",
	"no-shadow-restricted-names": "error",
	"no-sparse-arrays": "error",
	"no-this-before-super": "error",
	"no-undef": "error",
	"no-unexpected-multiline": "error",
	"no-unreachable": "error",
	"no-unsafe-finally": "error",
	"no-unsafe-negation": "error",
	"no-unused-labels": "error",
	"no-unused-vars": ["error", { vars: "all", args: "none" } ],
	"no-useless-catch": "error",
	"no-useless-escape": "error",
	"no-with": "error",
	"require-yield": "error",
	"use-isnan": "error",
	"valid-typeof": "error",

	// selection of best practices
	"accessor-pairs": "error",
	"array-callback-return": "error",
	"block-scoped-var": "error",
	"consistent-return": "error",
	"curly": ["error", "multi-line"],
	"dot-location": ["error", "property"],
	"dot-notation": "error",
	"eqeqeq": "error",
	"grouped-accessor-pairs": "error",
	"guard-for-in": "error",
	"no-alert": "error",
	"no-await-in-loop": "error",
	"no-caller": "error",
	"no-constructor-return": "error",
	"no-div-regex": "error",
	"no-else-return": "error",
	"no-empty-function": "error",
	"no-eq-null": "error",
	"no-eval": "error",
	"no-extend-native": "error",
	"no-extra-bind": "error",
	"no-extra-label": "error",
	"no-extra-parens": "error",
	"no-floating-decimal": "error",
	"no-implicit-coercion": "error",
	"no-implicit-globals": "error",
	"no-implied-eval": "error",
	"no-invalid-this": "error",
	"no-lone-blocks": "error",
	"no-loop-func": "error",
	"no-multi-spaces": "error",
	"no-multi-str": "error",
	"no-new": "error",
	"no-new-func": "error",
	"no-new-wrappers": "error",
	"no-octal-escape": "error",
	"no-proto": "error",
	"no-return-assign": "error",
	"no-return-await": "error",
	"no-script-url": "error",
	"no-self-compare": "error",
	"no-sequences": "error",
	"no-template-curly-in-string": "error",
	"no-unmodified-loop-condition": "error",
	"no-unused-expressions": "error",
	"no-useless-call": "error",
	"no-useless-concat": "error",
	"no-useless-return": "error",
	"no-void": "error",
	"prefer-regex-literals": "error",
	"radix": "error",
	"require-atomic-updates": "error",
	"wrap-iife": "error",
	"yoda": "error",

	// variable issues
	"no-label-var": "error",
	"no-shadow": "error",
	"no-undef-init": "error",
	"no-use-before-define": "error",

	// stylistic issues, only warn, most can be auto-fixed
	// those are quite opinionated...
	"array-bracket-spacing": [ "warn", "never" ],
	"brace-style": [ "warn", "1tbs", { allowSingleLine: true }],
	"comma-dangle": [ "warn", "always-multiline" ], // maybe only-multiline?
	"comma-spacing": "warn",
	"comma-style": "warn",
	"computed-property-spacing": "warn",
	"consistent-this": [ "warn", "me" ],
	"eol-last": "warn",
	"func-call-spacing": "warn",
	"func-name-matching": "warn",
	"func-style": "warn",
	"key-spacing": "warn",
	"keyword-spacing": "warn",
	"linebreak-style": "warn",
	"max-len": [ "warn", { code: 110, tabWidth: 8, ignoreComments: true, ignoreStrings: true, ignoreRegExpLiterals: true }],
	"no-array-constructor": "warn",
	"no-lonely-if": "warn",
	"no-mixed-operators": "warn",
	"no-multiple-empty-lines": "warn",
	"no-trailing-spaces": "warn",
	"no-underscore-dangle": [ "warn", { allowAfterThis: true, }],
	"no-unneeded-ternary": "warn",
	"no-whitespace-before-property": "warn",
	"object-curly-newline": "warn",
	"object-curly-spacing": [ "warn", "always" ],
	"operator-linebreak" : [ "warn", "after", { overrides: { "?": "after" }}],
	"padded-blocks": ["warn", "never"], // not sure ...
	"quote-props": [ "warn", "as-needed", { keywords: true, unnecessary: false }], // does nothing, maybe deactivate unnecessary
	"semi": "warn",
	"semi-spacing": "warn",
	"semi-style": "warn",
	"space-before-blocks": "warn",
	"space-before-function-paren": ["warn", "never"],
	"space-in-parens": "warn",
	"space-unary-ops": "warn",
	"switch-colon-spacing": "warn",
	"unicode-bom": "warn",
	"arrow-body-style": "warn",
	"arrow-spacing": "warn",
	"no-confusing-arrow": "warn",
	"prefer-numeric-literals": "warn",
	"template-curly-spacing": "warn",
     },
};

let config = defaultConfig;
if (program.config) {
    let path = program.config;
    if (program.config.match(/^[^/]/)) {
	path = process.cwd() + "/" + path;
    }
    config = {
	extends: path
    }
}

const cli = new eslint.CLIEngine({
    baseConfig: config,
    useEslintrc: true,
    fix: !!program.fix,
});

const report = cli.executeOnFiles(paths);
let exitcode = 0;
let files_err = [];
let files_warn = [];
let files_ok = [];
let fixes = 0;
console.log('------------------------------------------------------------');
report.results.forEach(function(result) {
    let filename = result.filePath;
    let msgs = result.messages;
    let max_sev = 0;
    if (!!program.fix && result.output) {
	fixes++;
    }
    if (msgs.length > 0) {
	console.error('[' + color.bold(filename) + ']:');
	msgs.forEach(function(e) {
	    let msg = 'at line ' + color.bold(e.line) + ' column ' +
			  color.bold(e.column) + ': ' + e.ruleId;
	    if (e.severity === 1) {
		console.error(color.yellow("Warning " + msg));
		if (max_sev < 1) {
		    max_sev = 1;
		}
	    } else if (e.severity === 2) {
		console.error(color.red("Error " + msg));
		if (exitcode < 1) {
		    exitcode = 1;
		}
		if (max_sev < 2) {
		    max_sev = 2;
		}
	    } else {
		console.error("Info " + msg);
	    }
	    if (e.message) {
		console.error(e.message);
	    }
	    if (e.suggestion) {
		console.error(e.suggestion);
	    }
	    if (!program.fix && e.fix) {
		fixes++;
		console.error("Could be auto-fixed");
	    }
	});

	if (max_sev === 1) {
	    files_warn.push(filename);
	} else if (max_sev === 2) {
	    files_err.push(filename);
	}
    } else {
	files_ok.push(filename);
	return;
    }

    console.log('------------------------------------------------------------');
});

if (report.results.length > 1) {
    console.log((`${color.bold(files_ok.length + files_err.length)} files:`));
    if (files_err.length > 0) {
	console.log(color.red(`${color.bold(files_err.length)} files have Errors`));
    }
    if (files_warn.length > 0) {
	console.log(color.yellow(`${color.bold(files_warn.length)} files have Warnings`));
    }
    if (files_ok.length > 0) {
	console.log(color.green(`${color.bold(files_ok.length)} files are OK`));
    }
    console.log('------------------------------------------------------------');
} else if (files_ok.length > 0) {
    console.log(color.green(`${files_ok[0]} OK`));
    console.log('------------------------------------------------------------');
}

if (program.fix) {
    if (fixes > 0) {
	console.log(`Writing ${color.bold(fixes)} fixed files...`);
	eslint.CLIEngine.outputFixes(report);
	console.log('Done');
    } else {
	console.log("No fixable Errors/Warnings found.");
    }
} else {
	console.log(`${color.bold(fixes)} Errors/Warnings could be auto-fixed.`);
}

process.exit(exitcode);

}());
