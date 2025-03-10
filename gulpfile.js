//   Author       : 果冻冻
//   Date         : 2025-03-09 11:00:34
//   Last Editor  : 果冻冻
//   Last         : 2025-03-11 06:28:41
//   File Path    : \gulpfile.js
//   Description  :
//
//   Code Created/Modified By Gxdung(乐乐龙果冻)

const gulp = require("gulp");
const terser = require("gulp-terser");
const pump = require("pump");

const SRC = "packages";
const DST = "build";

// copy all from SRC to DST, excluding: *.ts, *.tsx, *.less, ...
gulp.task("copy", function () {
    return gulp
        .src([
            SRC + "/**/*.*",
            "!" + SRC + "/**/*.ts",
            "!" + SRC + "/**/*.tsx",
            "!" + SRC + "/**/*.less",
            "!" + SRC + "/tsconfig.json",
            "!" + SRC + "/tsconfig.dev.json"
        ])
        .pipe(gulp.dest(DST));
});

// minify all *.js files in DST
gulp.task("minify", function (cb) {
    pump([gulp.src(DST + "/**/*.js"), terser(), gulp.dest(DST)], cb);
});

gulp.task("release", gulp.series("copy", "minify"));

gulp.task("debug", gulp.series("copy"));
