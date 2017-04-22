const moduleError = /Error: Cannot find module '([a-zA-Z0-9+_-]+)'/g;

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const spawn = require('child_process').spawn;

let bot;

const paths = {
    srcFiles: 'src/**/!(_)*.js',
    configFiles: 'config.json',
    gulpFile: 'gulpfile.js'
};

gulp.task('lint', () =>
    gulp.src([
        paths.srcFiles,
        paths.gulpFile
    ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
);

gulp.task('main', ['lint'], () => {
    if (bot) bot.kill();
    bot = spawn('node', ['src/bot.js'], { 'stdio': ['inherit', 'inherit', 'pipe'] });
    bot.stderr.on('data', data => {
        process.stderr.write(data);
        if (moduleError.test(data.toString())) {
            console.error(`
#########################################################################################################################
 Node has failed to load a module! If you just updated, you may need to run \'yarn\' again to install/update dependencies.
 'yarn' will attempt to run now and install the dependencies for you.
#########################################################################################################################
`);
            spawn('yarn', ['--force'], { 'stdio': 'inherit' }).on('close', code => {
                if (code === 0) {
                    console.log(`
New modules have been installed. The bot will now restart.
                `);
                    gulp.start('main');
                }
            });
        }
    });
    bot.on('close', code => {
        if (code === 42) {
            console.error('Restart code detected.');
            gulp.start('main');
        } else if (code === 666) {
            console.log('Process exit code detected.');
            process.exit(1);
        } else {
            console.log('Bot has exited. Waiting for changes...');
        }
    });
});

gulp.task('watch', () => {
    gulp.watch([
        paths.srcFiles,
        paths.configFiles
    ], ['main']);
});

gulp.task('default', ['main', 'watch']);

process.on('exit', () => {
    if (bot) bot.kill();
});
