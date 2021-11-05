using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Api.Areas.FinisherItems.Models;
using PersonHub.Domain.FinisherModule;
using PersonHub.IntegrationTest.DataAccess.FinisherItems;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.FinisherItems
{
    public static class FinsiherItemTestHelper
    {
        public const string UserId = "testuser@gmail.com";

        public static FinisherItemEntity CreateFinisherItemEntity(){

            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemEntity(){
                Title = "Test title" + randomText,
                UserId = UserId,
                Description ="Test Description" + randomText,
                Status = Domain.FinisherModule.FinisherItemStatus.Planning,
                StartDate = DateTime.Now,
                Tags = new string[]{"tag 1", "tag "+ randomText}
            };
        }

        public static FinisherItemLogEntity CreateFinisherItemLogEntity(long finisherItemId){
            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemLogEntity(){
                Content = "content" + randomText,
                CreatedDate = DateTime.Now,
                FinisherItemId = finisherItemId
            };
        }

        public static FinisherItemRequestDto CreateFinisherItemRequestDto(){

            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemRequestDto(){
                Title = "Test title" + randomText,
                Description ="Test Description" + randomText,
                Status = Domain.FinisherModule.FinisherItemStatus.Planning,
                StartDate = DateTime.Now,
                Tags = new string[]{"tag 1", "tag "+ randomText}
            };
        }

        public static FinisherItemLogDto CreateFinisherItemLogDto(){
            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemLogDto(){
                Content = "content" + randomText,
                CreatedDate = DateTime.Now,
            };
        }


        public static void AssertCompare(FinisherItemRequestDto requestDto, FinisherItem entity){
            Assert.True(requestDto.Title == entity.Title, "Title is not equal");
            Assert.True(requestDto.Description == entity.Description, "Description is not equal");

            Assert.True(requestDto.Tags.Count() == entity.Tags.Count(), "Tags are not equal");

            if(requestDto.Tags.Count() > 0){

                Assert.True(requestDto.Tags.All(r=> entity.Tags.Contains(r)), "Tags are not equal");
            }
        }

        public static void AssertCompare(FinisherItemRequestDto requestDto, FinisherItemEntity entity){
            Assert.True(requestDto.Title == entity.Title, "Title is not equal");
            Assert.True(requestDto.Description == entity.Description, "Description is not equal");

            Assert.True(requestDto.Tags.Count() == entity.Tags.Count(), "Tags are not equal");

            if(requestDto.Tags.Count() > 0){

                Assert.True(requestDto.Tags.All(r=> entity.Tags.Contains(r)), "Tags are not equal");
            }
        }

        public static void AssertCompare(FinisherItemEntity dbEntity, FinisherItem entity){
            Assert.True(dbEntity.Title == entity.Title, "Title is not equal");
            Assert.True(dbEntity.Description == entity.Description, "Description is not equal");

            Assert.True(dbEntity.Tags.Count() == entity.Tags.Count(), "Tags are not equal");

            if(dbEntity.Tags.Count() > 0){

                Assert.True(dbEntity.Tags.All(r=> entity.Tags.Contains(r)), "Tags are not equal");
            }
        }
    }
}