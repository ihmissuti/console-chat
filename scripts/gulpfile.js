'use strict';

const gulp = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-minify');

// Build task - concatenate and minify JavaScript
function build() {
    return gulp.src('src/*.js')
        .pipe(concat('console-chat.js'))
        .pipe(minify({
            ext: {
                min: '-min.js'
            },
            noSource: false
        }))
        .pipe(gulp.dest('./dist/'));
}

// Export tasks (Gulp 5.x compatible)
exports.default = build;
exports.build = build;
