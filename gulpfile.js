(function() {
    'use strict';

    var gulp = require('gulp');
    var runSequence = require('run-sequence');
    var plumber = require('gulp-plumber');

    var paths = {
        root: './',
        less: './less/',
        env: './components/env/env.json',
        components: './components/',
    };

    /**
     * Build
     */

    gulp.task('generate-env-module', function () {
        var ngConstant = require('gulp-ng-constant');

        if (!process.env.TSC_KINVEY_APP_KEY)    throw 'Environment variable TSC_KINVEY_APP_KEY is not set.';
        if (!process.env.TSC_KINVEY_APP_SECRET) throw 'Environment variable TSC_KINVEY_APP_SECRET is not set.';

        // This task builds the angular ENV constant
        // Constants defined here extend the constants in env.json
        var template =
            "/**\n" +
            " DO NOT EDIT\n" +
            " Generated by gulp during build.\n" +
            " Edit the generate-env-module task.\n" +
            " */\n" +
            "(function ppEnvironmentConstantModule() {\n" +
            "    'use strict';\n\n" +
            "    angular.module('App.env', [])\n" +
            "        .constant('ENV', {\n" +
            "<% constants.forEach(function(constant) { %>" +
            "            '<%- constant.name %>': <%= constant.value %>,\n" +
            "<%});%>" +
            "        });\n" +
            "}());";


        return gulp.src(paths.env)
            .pipe(ngConstant({
                name: 'foo',
                space: 4,
                template: template,
                constants: {
                    TSC_KINVEY_APP_KEY: process.env.TSC_KINVEY_APP_KEY,
                    TSC_KINVEY_APP_SECRET: process.env.TSC_KINVEY_APP_SECRET
                }
            }))
            .pipe(gulp.dest(paths.components + 'env'));
    });

    gulp.task('less', function() {
        var autoprefixer = require('gulp-autoprefixer');
        var less = require('gulp-less');

        return gulp.src([
            paths.less + 'app.less'
        ])
            .pipe(plumber(function onError(err) {
                    console.log(err.message);
                    this.emit('end');
                }
            ))
            .pipe(less())
            .pipe(autoprefixer())
            .pipe(gulp.dest('.'));
    });


    /**
     * Watch
     */
    gulp.task('watch', function() {
        gulp.watch([paths.root + '**/*.less'], ['less']);
    });


    /**
     * Serve
     */
    gulp.task('serve', function() {
        var webserver = require('gulp-webserver');

        return gulp.src(paths.root)
            .pipe(webserver({
                https: false,
                host: 'localhost',
                port: '8000',
                fallback: 'index.html',
                livereload: {
                    enable: true,
                    filter: function(fileName) {
                        // exclude less files
                        if (
                            fileName.match(/package.json/) ||
                            fileName.match(/bower.json/) ||
                            fileName.match(/node_modules/) ||
                            fileName.match(/bower_components/) ||
                            fileName.match(/.less$/) ||
                            fileName.match(/^gulpfile.js$/)                        
                        ) {
                            return false;
                        } else {
                            return true;
                        }
                    }
                },
                directoryListing: false,
                open: false,
            }));

    });


    /**
     * Build
     */
    gulp.task('heroku:production', function(cb) {
        runSequence(
            [
                'generate-env-module',
                'less',
            ],
            cb
        )
    });


    /**
     * Default
     */
    gulp.task('default', [
        'less',
        'serve',
        'watch',
    ]);

}());
