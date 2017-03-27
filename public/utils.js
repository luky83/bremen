function removeNotification(id){
  $.post("/remove-notification",{ _id: id },function (result){
    if (result.ok === 1){
      $('#'+id).empty().append(
        '<div class="alert alert-success alert-dismissible" role="alert">'
        +  '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
        +  '<strong>Ok!</strong> La notifica è stata rimossa.'
        +'</div>'
      );
    }
  });
}

function editNotification(id){
  $.get("/notifiche",{ _id: id }, function(data) {
    document.open();
    document.write(data);
    document.close();
  });
}

function saveTXT(){
  window.location = 'storico.txt';
}

function saveCSV(){
  window.location = 'storico.csv';
}
