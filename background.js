setTimeout(function(details) {
  const sections = $(".phui-box.phui-box-border.phui-object-box.mlt.mll.mlr.dashboard-box");
  const review_list = $(sections).find(".phui-oi-list-view");

  for (var box of review_list) {
    const $box = $(box);

    if ($box.parent().text().indexOf("Pending Reviews") == -1) {
      continue;
    }

    const reviews = $box.find(".phui-oi.phui-oi-with-icons.phui-oi-with-attrs.phui-oi-no-bar.phui-oi-standard");
    for (var review of reviews) {
      $review = $(review);
      if ($review.text().indexOf("charlesyeh") == -1) {
        //$review.hide();
      } else {
        $review.css('background-color', '#FFF3F3');
      }
    }
  }
}, 500);

