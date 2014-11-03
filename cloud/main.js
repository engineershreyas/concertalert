
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});


require('cloud/app.js');


Parse.Cloud.job("checkConcerts",function(request,status){
  var query = new Parse.Query(Parse.User);
  query.each(function(user){
      var artistName = user.get("artist");
      var username = user.get("username");
      var latitude = user.get("location").latitude;
      var longitude = user.get("location").longitude
      getArtistId(artistName,function(aId){
        compareDates(aId,latitude,longitude,function(myLink,status){
              if(status === true){
                sendYo(username,myLink);
              }
              
        });
      });




  });



});


function getArtistId(name,fn){
  console.log("Getting ArtistId...");
var artistId = '';
Parse.Cloud.httpRequest({
  url: 'http://api.songkick.com/api/3.0/search/artists.json',
 params: {
   query : name,
   apikey : 'LHaN1QA9OPa7zI19'
 },
 success: function(httpResponse){
    if(httpResponse.data.resultsPage.results.artist !== undefined){
    artistId = httpResponse.data.resultsPage.results.artist[0].id;
    fn(artistId);
    console.log("ArtistId found! It is " + artistId);
  }else{
    console.log("Artist not found");
    artistId = null;
    fn(artistId);
  }
 },
 error: function(httpResponse){
   console.error('Request to get artistId failed');
   artistId = null;
   fn(artistId);
 }

});

  //return artistId;

}

function findMetroId(lat,lng,fn){
  console.log("getting MetroId...");
  var metroId = '';
  Parse.Cloud.httpRequest({
    url: 'http://api.songkick.com/api/3.0/search/locations.json',
    params: {
      location : 'geo:' + lat + ',' + lng,
      apikey : 'LHaN1QA9OPa7zI19'
    },
    success: function(httpResponse){
      console.log(httpResponse.data.resultsPage.results.location);
      metroId = httpResponse.data.resultsPage.results.location[0].metroArea.id;
      fn(metroId);
      console.log("MetroId found! It is " + metroId);

    },
    error: function(httpResponse){
      console.error("Request to find metroId failed because " + httpResponse.text + ", code: " + httpResponse.status);
      metroId = null;
      fn(metroId);
    }
  });

  //return metroId;
}


function compareDates(singerId,lat,lng,fn){
  var concertStatus = false;
  var myUri;
  Parse.Cloud.httpRequest({
    url: 'http://api.songkick.com/api/3.0/artists/'+singerId+'/calendar.json',
    params: {
      apikey : 'LHaN1QA9OPa7zI19'
    },
    success: function(httpResponse){
    console.log("Got artists calendar!");
    console.log("Here is response text: " + httpResponse.text);
    //console.log("Length of results" + httpResponse.data.resultsPage.results.length);

  var events = httpResponse.data.resultsPage.results.event;

  if(events !== undefined && events.length > 0){
        console.log("Events found!");
      var dateBenchmark = new Date();
      dateBenchmark.setTime(dateBenchmark.getTime() + (14 * 86400000));

     //for(var i = 0; i < events.length;i++){
       //consoles.log("Event: " + i);
      var anEvent = events[0];

      var latOfEvent = anEvent.location.lat;
      var lngOfEvent = anEvent.location.lng;

      var R = 6371; //km
      console.log("lat is " + lat + " and lng is " + lng);
      var radOne = lat * (Math.PI/180);
      var radTwo = latOfEvent * (Math.PI/180);
      var deltaLat = (latOfEvent - lat) * (Math.PI/180);
      var deltaLng = (lngOfEvent - lng) * (Math.PI/180);
      var a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + Math.cos(radOne) * Math.cos(radTwo) * Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      console.log("a is " + a);
      var c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      console.log("c is " + c);
      var d = R * c;
      var miles = d * 0.62137;
      console.log(miles + " away from the event");
      if(miles < 100){
          myUri = anEvent.uri;
          //console.log(anEvent);
          console.log("There is an event with the user's artist within a 100 miles");
          var parts = anEvent.start.date.split('-');
          console.log(parts);
          var dateOfEvent = new Date(parts[0],parts[1]-1,parts[2]);
          console.log(dateOfEvent);
        if(dateOfEvent <= dateBenchmark){
          fn(myUri,true);
          console.log("There is an event with user's artist within two weeks");
        }else{
          console.log("There is no event with user's artitst within two weeks");
          fn(myUri,false);
        }
      }else{
          console.log("There is no event with the user's artist within a 100 miles");
          fn(myUri,false);
      }


      //}
}

    else{
      console.log("No results found :(");
      fn(myUri,false);

      }

    },
    error: function(httpResponse){
      console.error("Request to compare dates failed because " + httpResponse.text + " code: " + httpResponse.status);
      fn(myUri,false);
    }
  });


}


function sendYo(user,aLink){
  console.log("Sending Yo...");
  var params = "api_token=41e8ba80-3558-4939-b4d4-db831cc6f254&username="+user+"&link="+aLink;
  Parse.Cloud.httpRequest({
    method: 'POST',
    url: 'http://api.justyo.co/yo/',
    body: {
      username : user,
      api_token : '41e8ba80-3558-4939-b4d4-db831cc6f254',
      link : aLink
    },
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
      'Content-length': params.length,
      'Connection': 'close'
    },
    success: function(httpResponse){
      console.log("Yo sent!");
      console.log(httpResponse.text);
    },
    error: function(httpResponse){
      console.error("Failed to send Yo");
      console.log(httpResponse.text);

    }

  });
}
